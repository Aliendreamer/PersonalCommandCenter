using Pcc.Plugins.Mail;

namespace CoreApi.Tests;

public class MailFolderTests
{
    // -----------------------------------------------------------------------
    // 1. No provider — folder name returned as-is
    // -----------------------------------------------------------------------
    [Fact]
    public void Resolve_without_provider_returns_name_unchanged()
    {
        var opts = new ImapOptions();
        Assert.Equal("Sent", opts.Resolve("Sent"));
        Assert.Equal("INBOX", opts.Resolve("INBOX"));
        Assert.Equal("Drafts", opts.Resolve("Drafts"));
    }

    // -----------------------------------------------------------------------
    // 2. Gmail provider — well-known folders map to Gmail IMAP names
    // -----------------------------------------------------------------------
    [Theory]
    [InlineData("Sent", "[Gmail]/Sent Mail")]
    [InlineData("Drafts", "[Gmail]/Drafts")]
    [InlineData("Trash", "[Gmail]/Trash")]
    [InlineData("All Mail", "[Gmail]/All Mail")]
    [InlineData("Spam", "[Gmail]/Spam")]
    [InlineData("Starred", "[Gmail]/Starred")]
    public void Resolve_with_gmail_provider_maps_standard_names(string display, string expected)
    {
        var opts = new ImapOptions { Provider = "gmail" };
        Assert.Equal(expected, opts.Resolve(display));
    }

    // -----------------------------------------------------------------------
    // 3. Gmail provider — INBOX is not remapped
    // -----------------------------------------------------------------------
    [Fact]
    public void Resolve_with_gmail_provider_leaves_inbox_unchanged()
    {
        var opts = new ImapOptions { Provider = "gmail" };
        Assert.Equal("INBOX", opts.Resolve("INBOX"));
    }

    // -----------------------------------------------------------------------
    // 4. Gmail provider is case-insensitive
    // -----------------------------------------------------------------------
    [Fact]
    public void Resolve_gmail_provider_is_case_insensitive()
    {
        var opts = new ImapOptions { Provider = "Gmail" };
        Assert.Equal("[Gmail]/Sent Mail", opts.Resolve("Sent"));
    }

    // -----------------------------------------------------------------------
    // 5. Custom FolderAliases override Gmail preset
    // -----------------------------------------------------------------------
    [Fact]
    public void Resolve_custom_alias_overrides_gmail_preset()
    {
        var opts = new ImapOptions
        {
            Provider = "gmail",
            FolderAliases = new Dictionary<string, string>
            {
                ["Sent"] = "CustomSent"
            }
        };
        Assert.Equal("CustomSent", opts.Resolve("Sent"));
        // Non-overridden Gmail folders still use preset
        Assert.Equal("[Gmail]/Drafts", opts.Resolve("Drafts"));
    }

    // -----------------------------------------------------------------------
    // 6. Custom FolderAliases without provider
    // -----------------------------------------------------------------------
    [Fact]
    public void Resolve_custom_alias_without_provider()
    {
        var opts = new ImapOptions
        {
            FolderAliases = new Dictionary<string, string>
            {
                ["Sent Items"] = "Sent"
            }
        };
        Assert.Equal("Sent", opts.Resolve("Sent Items"));
        Assert.Equal("INBOX", opts.Resolve("INBOX"));
    }

    // -----------------------------------------------------------------------
    // 7. Unknown folder with Gmail provider returns name unchanged
    // -----------------------------------------------------------------------
    [Fact]
    public void Resolve_unknown_folder_with_gmail_provider_returns_unchanged()
    {
        var opts = new ImapOptions { Provider = "gmail" };
        Assert.Equal("MyCustomLabel", opts.Resolve("MyCustomLabel"));
    }
}
