using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Pcc.Plugins.Generator;

namespace CoreApi.Tests;

public class PluginRegistrationGeneratorTests
{
    [Fact]
    public void Finds_public_concrete_plugins_only()
    {
        var output = Run(
            """
            namespace Pcc.Plugins { public interface IPlugin { } }
            namespace Demo {
              public class FooPlugin : Pcc.Plugins.IPlugin { }
              public abstract class BasePlugin : Pcc.Plugins.IPlugin { }
              internal class Hidden : Pcc.Plugins.IPlugin { }
            }
            """);

        Assert.Contains("typeof(global::Demo.FooPlugin).Assembly", output);
        Assert.DoesNotContain("BasePlugin", output);
        Assert.DoesNotContain("Hidden", output);
    }

    [Fact]
    public void Emits_empty_array_when_no_plugins()
    {
        var output = Run("namespace Pcc.Plugins { public interface IPlugin { } }");

        Assert.Contains("Assemblies = new global::System.Reflection.Assembly[]", output);
        Assert.DoesNotContain("typeof(", output);
    }

    private static string Run(string source)
    {
        var references = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic && !string.IsNullOrEmpty(a.Location))
            .Select(a => (MetadataReference)MetadataReference.CreateFromFile(a.Location));

        var compilation = CSharpCompilation.Create(
            "TestAsm",
            [CSharpSyntaxTree.ParseText(source)],
            references,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

        CSharpGeneratorDriver.Create(new PluginRegistrationGenerator())
            .RunGeneratorsAndUpdateCompilation(compilation, out var output, out _);

        return output.SyntaxTrees
            .First(t => t.FilePath.EndsWith("PccPlugins.g.cs", StringComparison.Ordinal))
            .ToString();
    }
}
