using Pcc.Plugins.Generated;

namespace CoreApi.Tests;

/// <summary>
/// Guards the build-time generator against silently missing a plugin: the generated assembly array
/// must have one entry per <c>*Plugin.csproj</c> under <c>plugins/</c>.
/// </summary>
public class PluginRegistrationCoverageTests
{
    [Fact]
    public void Generated_array_covers_every_plugin_project()
    {
        var root = RepoRoot();
        var projectCount = Directory
            .GetFiles(Path.Combine(root, "plugins"), "*Plugin.csproj", SearchOption.AllDirectories)
            .Length;

        Assert.True(projectCount > 0, "expected to find plugin projects on disk");
        Assert.Equal(projectCount, PccPlugins.Assemblies.Length);
    }

    private static string RepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "PersonalCommandCenter.slnx")))
        {
            dir = dir.Parent;
        }

        Assert.NotNull(dir);
        return dir!.FullName;
    }
}
