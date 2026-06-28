namespace Pcc.Plugins.Mail;

public interface ISmtpMailSender
{
    Task SendAsync(SendRequest req, CancellationToken ct);
}
