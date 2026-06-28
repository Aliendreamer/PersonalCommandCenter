namespace Pcc.Plugins.Mail;

public interface IImapMailClient
{
    Task<IReadOnlyList<MessageHeader>> GetHeadersAsync(string folder, int limit, int offset, CancellationToken ct);
    Task<MessageBody> GetBodyAsync(string folder, uint uid, CancellationToken ct);
}
