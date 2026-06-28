namespace Pcc.Plugins.Mail;

public sealed record MessageHeader(
    uint Uid,
    string Subject,
    string From,
    string To,
    DateTimeOffset Date,
    bool IsRead,
    string? Tag,
    string Folder);

public sealed record MessageBody(
    uint Uid,
    string Subject,
    string From,
    string To,
    DateTimeOffset Date,
    bool IsRead,
    string Body,
    IReadOnlyList<AttachmentInfo> Attachments,
    string Folder);

public sealed record AttachmentInfo(string Name, long Size);

public sealed record SendRequest(
    string[] To,
    string Subject,
    string Body,
    uint? ReplyToUid = null,
    string? ReplyToMessageId = null,
    string Folder = "INBOX");

public sealed record AiRequest(uint Uid, string? Folder = "INBOX");

public sealed record AiReplyRequest(uint Uid, string? Instruction = null, string? Folder = "INBOX");
