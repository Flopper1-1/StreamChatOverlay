using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("Stream Chat Overlay")]
[assembly: AssemblyDescription("Stream Chat Overlay Launcher")]
[assembly: AssemblyProduct("Stream Chat Overlay")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

class StreamChatOverlayLauncher
{
    [STAThread]
    static void Main(string[] args)
    {
        string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        string appDir = Path.Combine(userProfile, @".gemini\antigravity\scratch\stream-chat-overlay");
        if (!Directory.Exists(appDir))
        {
            appDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
        }
        string electronExe = Path.Combine(appDir, @"node_modules\electron\dist\electron.exe");

        if (!File.Exists(electronExe))
        {
            MessageBox.Show(
                "Could not find Stream Chat Overlay runtime.",
                "Stream Chat Overlay",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return;
        }

        ProcessStartInfo psi = new ProcessStartInfo
        {
            FileName = electronExe,
            Arguments = "\"" + appDir + "\"",
            WorkingDirectory = appDir,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        if (psi.EnvironmentVariables.ContainsKey("ELECTRON_RUN_AS_NODE"))
        {
            psi.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE");
        }

        Process.Start(psi);
    }
}


