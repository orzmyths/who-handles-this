// Controls use the resident UI's translation batch. Critical safety statements
// have fixed translations below: a machine translation must not weaken them.
export const DEFAULT_EMAIL_COPY = {
  heading: 'Prepare an email to this department',
  sendsNothing: 'This app sends nothing. Opening a draft in your email app is not delivery, and an email does not submit an official case or complaint.',
  sensitive: 'Do not put sensitive details in email. Use the official secure channel for those.',
  to: 'To (fixed, from official source)',
  evidence: 'Official evidence source',
  reviewedOn: 'Reviewed',
  subject: 'Subject',
  body: 'Message',
  subjectHelp: 'One line, up to 150 characters.',
  bodyHelp: 'Edits stay in this browser tab only. Nothing is saved or sent. Changing language restores the template and clears your review checks; your edits are not translated.',
  confirmContent: 'I confirmed the recipient, subject and message are correct.',
  confirmSender: 'I will check which sender account my email app uses and review the draft before pressing Send.',
  open: 'Open draft in my email app',
  openedNote: 'Your email app was asked to open a draft. Nothing has been sent by this app; check your email app.',
  copy: 'Copy message instead',
  copied: 'Copied to clipboard. Paste it into your email app.',
  copyFailed: 'Copy failed. Select the text in the fields above and copy it manually.',
  invalidSubject: 'Subject is required (max 150 characters).',
  invalidBody: 'Message is required (max 4000 characters).',
  invalidRecipient: 'The recipient address failed validation, so no draft can be opened.',
  staleEvidence: 'The email contact source needs review. No draft can be opened; confirm current contact options on the official website.',
  noEmail: 'No verified email address',
  noEmailFallback: 'No verified email address is on file for this department. Use the official source below.',
  officialSource: 'Official source',
  altChannel: 'Other official option',
  openLink: 'Open',
  copyAll: 'To',
  emailTranslating: 'Translating the official channel instructions and email template. No draft can be opened yet.',
  emailTranslationFailed: 'The email instructions could not be translated. No draft can be opened. Retry, or check contact options on the official website.',
};

type EmailSafetyCopy = Pick<typeof DEFAULT_EMAIL_COPY,
  'sendsNothing' | 'sensitive' | 'confirmContent' | 'confirmSender' | 'openedNote'>;

const EMAIL_SAFETY_COPY: Record<string, EmailSafetyCopy> = {
  es: {
    sendsNothing: 'Esta aplicación no envía nada. Abrir un borrador en su aplicación de correo no significa que se haya entregado. Un correo no presenta un caso oficial ni una queja.',
    sensitive: 'No incluya información sensible en el correo. Para esos datos, use el canal oficial seguro.',
    confirmContent: 'Confirmé que el destinatario, el asunto y el mensaje son correctos.',
    confirmSender: 'Comprobaré qué cuenta remitente usa mi aplicación de correo y revisaré el borrador antes de pulsar Enviar.',
    openedNote: 'Se pidió a su aplicación de correo que abriera un borrador. Esta aplicación no envió nada; revise su aplicación de correo.',
  },
  de: {
    sendsNothing: 'Diese App versendet nichts. Das Öffnen eines Entwurfs in Ihrem E-Mail-Programm bedeutet nicht, dass er zugestellt wurde. Eine E-Mail reicht weder einen offiziellen Vorgang noch eine Beschwerde ein.',
    sensitive: 'Geben Sie keine sensiblen Informationen in der E-Mail an. Nutzen Sie dafür den offiziellen sicheren Kontaktweg.',
    confirmContent: 'Ich habe geprüft, dass Empfängeradresse, Betreff und Nachricht korrekt sind.',
    confirmSender: 'Ich werde prüfen, welches Absenderkonto mein E-Mail-Programm verwendet, und den Entwurf überprüfen, bevor ich auf „Senden“ klicke.',
    openedNote: 'Ihr E-Mail-Programm wurde aufgefordert, einen Entwurf zu öffnen. Diese App hat nichts versendet; prüfen Sie Ihr E-Mail-Programm.',
  },
  vi: {
    sendsNothing: 'Ứng dụng này không gửi bất cứ nội dung nào. Mở bản nháp trong ứng dụng email không có nghĩa là email đã được gửi đến người nhận. Email không phải là cách nộp hồ sơ chính thức hoặc đơn khiếu nại.',
    sensitive: 'Không đưa thông tin nhạy cảm vào email. Hãy sử dụng kênh chính thức bảo mật để cung cấp những thông tin đó.',
    confirmContent: 'Tôi đã kiểm tra và xác nhận địa chỉ người nhận, tiêu đề và nội dung thư đều chính xác.',
    confirmSender: 'Tôi sẽ kiểm tra tài khoản người gửi mà ứng dụng email sử dụng và xem lại bản nháp trước khi nhấn Gửi.',
    openedNote: 'Ứng dụng email của bạn đã được yêu cầu mở bản nháp. Ứng dụng này chưa gửi bất cứ nội dung nào; hãy kiểm tra ứng dụng email của bạn.',
  },
  zh: {
    sendsNothing: '本应用不会发送任何内容。在您的邮件应用中打开草稿不代表邮件已送达。电子邮件不能用于提交正式案件或投诉。',
    sensitive: '请勿在电子邮件中填写敏感信息。请通过官方安全渠道提供这些信息。',
    confirmContent: '我已确认收件人地址、主题和邮件内容均正确。',
    confirmSender: '我会检查邮件应用使用的发件人账户，并在点击“发送”前检查草稿。',
    openedNote: '已请求您的邮件应用打开草稿。本应用没有发送任何内容；请检查您的邮件应用。',
  },
  'zh-TW': {
    sendsNothing: '本應用程式不會傳送任何內容。在您的電子郵件應用程式中開啟草稿不代表郵件已送達。電子郵件不能用來提交正式案件或申訴。',
    sensitive: '請勿在電子郵件中填寫敏感資訊。請透過官方安全管道提供這些資訊。',
    confirmContent: '我已確認收件者地址、主旨和郵件內容均正確。',
    confirmSender: '我會檢查電子郵件應用程式使用的寄件者帳號，並在按下「傳送」前檢查草稿。',
    openedNote: '已請求您的電子郵件應用程式開啟草稿。本應用程式沒有傳送任何內容；請檢查您的電子郵件應用程式。',
  },
  tl: {
    sendsNothing: 'Walang ipinapadala ang app na ito. Ang pagbukas ng draft sa iyong email app ay hindi nangangahulugang naihatid na ang email. Ang email ay hindi pagsusumite ng opisyal na kaso o reklamo.',
    sensitive: 'Huwag maglagay ng sensitibong impormasyon sa email. Gamitin ang opisyal at ligtas na paraan ng pakikipag-ugnayan para sa impormasyong iyon.',
    confirmContent: 'Kinumpirma kong tama ang email address ng tatanggap, ang paksa, at ang mensahe.',
    confirmSender: 'Titingnan ko kung aling account ng nagpadala ang ginagamit ng aking email app at susuriin ko ang draft bago pindutin ang Ipadala.',
    openedNote: 'Hiniling sa iyong email app na magbukas ng draft. Walang ipinadala ang app na ito; tingnan ang iyong email app.',
  },
};

export function getEmailSafetyCopy(language: string): EmailSafetyCopy {
  const normalized = language === 'zh-CN' ? 'zh' : language;
  return EMAIL_SAFETY_COPY[normalized] ?? DEFAULT_EMAIL_COPY;
}
