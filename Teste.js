const path = require("path");
const fs = require("fs");
const { question, onlyNumbers } = require("./utils");
const { isGlobal } = require("./middlewares/dxrkplusPermissions"); // Importa a função isGlobal

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidStatusBroadcast,
  makeInMemoryStore,
} = require("baileys");
const NodeCache = require("node-cache");
const pino = require("pino");
const { load } = require("./loader");
const {
  warningLog,
  infoLog,
  errorLog,
  sayLog,
  successLog,
} = require("./utils/logger");

const DATA_DIR = path.resolve(__dirname, "..", "assets", "data");
const BLOCKED_DIR = path.join(DATA_DIR, "bloqueados");
const CONTACTS_DIR = path.join(DATA_DIR, "contatos");
const GROUPS_DIR = path.join(DATA_DIR, "grupos");
const MESSAGES_DIR = path.join(DATA_DIR, "mensagens");
const STATUS_DIR = path.join(DATA_DIR, "status");
const GROUP_STATUS_FILE = path.resolve(__dirname, "..", "database", "groupsStatus.json");

const store = makeInMemoryStore({});

// Função para carregar ou criar o arquivo groupsStatus.json
function loadGroupStatus() {
  if (!fs.existsSync(GROUP_STATUS_FILE)) {
    fs.writeFileSync(GROUP_STATUS_FILE, JSON.stringify({ groups: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(GROUP_STATUS_FILE, "utf-8"));
}

// Função para salvar o estado de grupos
function saveGroupStatus(groupStatus) {
  fs.writeFileSync(GROUP_STATUS_FILE, JSON.stringify(groupStatus, null, 2));
}

const msgRetryCounterCache = new NodeCache();

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.resolve(__dirname, "..", "assets", "auth", "baileys")
  );

  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    defaultQueryTimeoutMs: 60 * 1000,
    auth: state,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid) || isJidStatusBroadcast(jid),
    keepAliveIntervalMs: 60 * 1000,
    markOnlineOnConnect: true,
    msgRetryCounterCache,
  });
  
    [BLOCKED_DIR, CONTACTS_DIR, GROUPS_DIR, MESSAGES_DIR, STATUS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  if (!socket.authState.creds.registered) {
    warningLog("Você ainda não vinculou um número ao bot!");

    infoLog('Você precisa inserir um número. (Exemplo: 5551985069870)');

    const phoneNumber = await question("Insira o número do bot: ");

    if (!phoneNumber) {
      errorLog(
        'Número inválido! Tente novamente com o comando "npm start".'
      );

      process.exit(1);
    }

    const code = await socket.requestPairingCode(onlyNumbers(phoneNumber));

    sayLog(`Insira o código no WhatsApp do bot: ${code}`);
  }

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (statusCode === DisconnectReason.loggedOut) {
        errorLog("Bot desconectado!");
      } else {
        switch (statusCode) {
          case DisconnectReason.badSession:
            warningLog("Sessão inválida!");
            break;
          case DisconnectReason.connectionClosed:
            warningLog("Conexão fechada!");
            break;
          case DisconnectReason.connectionLost:
            warningLog("Conexão perdida!");
            break;
          case DisconnectReason.connectionReplaced:
            warningLog("Conexão substituída!");
            break;
          case DisconnectReason.multideviceMismatch:
            warningLog("Dispositivo incompatível!");
            break;
          case DisconnectReason.forbidden:
            warningLog("Conexão proibida!");
            break;
          case DisconnectReason.restartRequired:
            infoLog('Reinicie, por favor! Digite "npm start".');
            break;
          case DisconnectReason.unavailableService:
            warningLog("Serviço indisponível!");
            break;
        }

        const newSocket = await connect();
        load(newSocket);
      }
    } else if (connection === "open") {
      successLog("Conectado!");
    } else {
      infoLog("Atualizando conexão...");
    }
  });

  socket.ev.on("creds.update", saveCreds);

// Evento para detectar novos participantes
socket.ev.on("group-participants.update", async ({ id, participants, action }) => {
    const groupStatus = loadGroupStatus();

    // Verifica se o grupo tem boas-vindas ativadas
    const group = groupStatus.groups[id] || { boasVindas: false, boasVindasMsg: "Bem vindo(a) %user%!\n> Entrou: %date% às %time%." };

    if (action === "add" && group.boasVindas) {
        const now = new Date();

        // Formata a data como DD/MM/YYYY
        const date = now.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

        // Formata a hora como HH:MM:SS
        const time = now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

        for (const participant of participants) {
            let welcomeMsg = group.boasVindasMsg
                .replace("%user%", `@${participant.split('@')[0]}`)
                .replace("%date%", date)
                .replace("%time%", time);
            
            await socket.sendMessage(id, { text: welcomeMsg, mentions: [participant] });
        }

        // Verificar se o usuário é global em todos os grupos
        for (const participant of participants) {
            const isParticipantGlobal = await checkIfGlobal(participant);

            if (isParticipantGlobal) {
                // Adiciona o usuário como global no grupo atual
                if (!groupStatus.groups[id].users) {
                    groupStatus.groups[id].users = {};
                }
                groupStatus.groups[id].users[participant] = { usuarioGlobal: true };

                // Salva as atualizações no arquivo
                saveGroupStatus(groupStatus);
            }
        }
    }

    // Atualiza o status do grupo no arquivo
    if (!groupStatus.groups[id]) {
        groupStatus.groups[id] = group;
        saveGroupStatus(groupStatus);
    }
});

// Função para verificar se o usuário é global
async function checkIfGlobal(participant) {
    const USER_STATUS_PATH = path.join(__dirname, '../database/userStatus.json');

    // Lê o arquivo JSON para obter os status do usuário
    let userStatusData;
    try {
        userStatusData = JSON.parse(fs.readFileSync(USER_STATUS_PATH, 'utf8'));
    } catch (error) {
        console.error("Erro ao ler o arquivo de status do usuário:", error);
        return false; // Retorna false se não for possível ler os dados
    }

    // Verifica se o usuário é global em qualquer grupo
    for (const groupId in userStatusData.groups) {
        const groupUsers = userStatusData.groups[groupId].users;
        if (groupUsers && groupUsers[participant]) {
            if (groupUsers[participant].usuarioGlobal) {
                return true; // O usuário é global
            }
        }
    }

    return false; // O usuário não é global
}

  socket.ev.on("chats.upsert", async (chats) => {
    for (const chat of chats) {
      const chatPath = path.join(GROUPS_DIR, `${chat.id}.json`);
      fs.writeFileSync(chatPath, JSON.stringify(chat, null, 2));
    }
  });

  socket.ev.on("contacts.upsert", async (contacts) => {
    for (const contact of contacts) {
      const contactPath = path.join(CONTACTS_DIR, `${contact.id}.json`);
      fs.writeFileSync(contactPath, JSON.stringify(contact, null, 2));
    }
  });

  socket.ev.on("messages.upsert", async ({ messages }) => {
    messages.forEach(message => {
        const groupJid = message.key.remoteJid;
        const userJid = message.key.participant || message.key.remoteJid;
        const groupDir = path.join(MESSAGES_DIR, `${groupJid}`);

        if (!fs.existsSync(groupDir)) {
            fs.mkdirSync(groupDir, { recursive: true });
        }

        const userMessagePath = path.join(groupDir, `${userJid}.json`);
        fs.writeFileSync(userMessagePath, JSON.stringify(message, null, 2));
    });
  });

  socket.ev.on("blocklist.update", async (blocked) => {
    for (const jid of blocked) {
      const blockedPath = path.join(BLOCKED_DIR, `${jid}.json`);
      fs.writeFileSync(blockedPath, JSON.stringify(jid, null, 2));
    }
  });

  socket.ev.on("status.update", async (status) => {
    const statusPath = path.join(STATUS_DIR, `${status.id}.json`);
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
  });
    
    return socket;
}

exports.connect = connect;
