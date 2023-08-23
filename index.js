const { makeWASocket, DisconnectReason, AnyMessageContent, delay, useMultiFileAuthState, makeInMemoryStore } = require('@whiskeysockets/baileys')
const { Boom } = require("@hapi/boom")
const pino = require("pino");
const notifier = require('mail-notifier');

const imap = {
  user: "your email",
  password: "your password email",
  host: "host email", // Ex outlook.office365.com
  port: 993,
  tls: true,
};

const whatsappRecipientNumber = "6281329896085@s.whatsapp.net"; // Replace with the WhatsApp recipient's number

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  async function startSock() {
    const sock = makeWASocket({
      version: [2, 2208, 7],
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      auth: state,
      browser: ['ST4RZ', 'Chrome', '3.0'],
      patchMessageBeforeSending: (message) => {
        const requiresPatch = !!(
          message.buttonsMessage ||
          // || message.templateMessage
          message.listMessage
        );
        if (requiresPatch) {
          message = {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadataVersion: 2,
                  deviceListMetadata: {},
                },
                ...message,
              },
            },
          };
        }

        return message;
      },

      /*getMessage: async key => {
          console.log('Reconnect')
      }*/
    })
    sock.ev.on('messages.upsert', async m => {
      if (!m.messages) return
      const msg = m.messages[0]

    })

    sock.ev.on('connection.update', (update) => {
      if (global.qr !== update.qr) {
        global.qr = update.qr
      }
      const { connection, lastDisconnect } = update
      if (connection === 'close') {

        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut ? startSock() : console.log('connection logged out...')
      }
    })

    sock.ev.on('creds.update', await saveCreds)
    console.log('----------------------------------------------------------------------------')
    console.log('RUNNING THE SCRIPT..')
    console.log('----------------------------------------------------------------------------')
    console.log('[SERVER] Server Started!')

    await delay(5000)

    const n = notifier(imap);
    n.on('end', () => n.start()) // session closed
      .on('mail', async mail => {
        let mailreceive = "";
        mailreceive += "From Email: " + "*" + mail.from.address + "* \n"
        mailreceive += "From Name: " + "*" + mail.from.name + "* \n"
        mailreceive += "Date: " + "*" + mail.date + "* \n"
        mailreceive += "Subject: " + "*" + mail.subject + "* \n"
        mailreceive += "\n\n"
        mailreceive += "Message: " + "\n\n" + mail.text
        await sock.sendMessage(whatsappRecipientNumber, { text: mailreceive })
      })
      .start();
  }

  await startSock();

}
start()