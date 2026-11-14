// ─────────────────────────────────────────────────────────────────────────────
// LaserCalc — پوستهٔ ویندوز (WinForms + WebView2)
// v1.1.22 — رفع «.Dll was not found.»:
//   WebView2Loader.dll به‌صورت منبع تعبیه‌شده، هنگام اجرا به %LOCALAPPDATA%\LaserCalc\bin
//   استخراج و صریحاً بارگذاری می‌شود (NativeLibrary.Load) — به‌جای تکیه بر جست‌وجوی
//   باندل تک‌فایل. تشخیص Runtime با API رسمی + پشتیبان رجیستری/پوشه‌ها + دیالوگ
//   «تلاش دوباره». دیالوگ خطای پایانی، جزئیات کامل استثنا را نشان می‌دهد.
// معماری مثل نسخه‌های قبلی: سایت تعبیه‌شده → استخراج به LaserCalc\www\v{نسخه} ←
// سرویس‌دهی لوکال روی 127.0.0.1:47231 (منشأ ثابت = حفظ دادهٔ ذخیره‌شدهٔ کاربر) ←
// userDataFolder ثابت LaserCalc\WebView2.
// ─────────────────────────────────────────────────────────────────────────────
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;

namespace LaserCalc;

internal static class Program
{
    public const string Version = "1.1.22";
    private const ushort Port = 47231;
    private static readonly string AppDataDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LaserCalc");
    private static readonly string BinDir = Path.Combine(AppDataDir, "bin");
    private static readonly string WwwDir = Path.Combine(AppDataDir, "www", "v" + Version);
    private static readonly string UserDataDir = Path.Combine(AppDataDir, "WebView2");

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        try
        {
            EnsureLoaderDll();
            string wwwDir = ExtractSite();
            string url = StartServer(wwwDir);
            string runtimeDir = EnsureWebView2Runtime();
            var env = Microsoft.Web.WebView2.Core.CoreWebView2Environment.CreateAsync(
                browserExecutableFolder: string.IsNullOrWhiteSpace(runtimeDir) ? null : runtimeDir,
                userDataFolder: UserDataDir).GetAwaiter().GetResult();
            Application.Run(new HostForm(env, url));
        }
        catch (Exception ex)
        {
            Fatal(ex);
        }
    }

    // ─── WebView2Loader.dll — استخراج از منبع تعبیه‌شده و بارگذاری صریح ───
    private static void EnsureLoaderDll()
    {
        try
        {
            var asm = Assembly.GetExecutingAssembly();
            string resName = asm.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith("WebView2Loader.dll", StringComparison.OrdinalIgnoreCase));
            if (resName == null) return; // منبع نبود؟ نسخهٔ خود SDK در باندل تلاش می‌شود
            Directory.CreateDirectory(BinDir);
            string target = Path.Combine(BinDir, "WebView2Loader.dll");
            using (var rs = asm.GetManifestResourceStream(resName))
            {
                bool needWrite = !File.Exists(target) || new FileInfo(target).Length != rs!.Length;
                if (needWrite)
                {
                    using var fs = File.Create(target);
                    rs!.CopyTo(fs);
                }
            }
            try
            {
                NativeLibrary.Load(target);
                // ماژول در پروسه لود شد؛ همهٔ DllImportهای بعدیِ «WebView2Loader.dll»
                // به همین ماژول وصل می‌شوند.
            }
            catch
            {
                // اگر بارگذاری صریح نشد، مسیرهای خود SDK/استخراج باندل امتحان می‌شوند.
            }
        }
        catch
        {
            // هیچ‌وقت جلوی راه‌اندازی را نگیر؛ خطاهای بعدی با جزئیات نشان داده می‌شوند.
        }
    }

    // ─── استخراج سایت تعبیه‌شده ───
    private static string ExtractSite()
    {
        var asm = Assembly.GetExecutingAssembly();
        string resName = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("LaserCalc.www.zip", StringComparison.OrdinalIgnoreCase))
            ?? throw new Exception("منبع تعبیه‌شدهٔ LaserCalc.www.zip پیدا نشد.");
        Directory.CreateDirectory(WwwDir);
        string okMarker = Path.Combine(WwwDir, ".ok");
        if (!File.Exists(okMarker))
        {
            string zipPath = Path.Combine(Path.GetTempPath(), "LaserCalc-www-" + Version + ".zip");
            using (var rs = asm.GetManifestResourceStream(resName)!)
            using (var fs = File.Create(zipPath))
            {
                rs.CopyTo(fs);
            }
            System.IO.Compression.ZipFile.ExtractToDirectory(zipPath, WwwDir, overwriteFiles: true);
            File.WriteAllText(okMarker, Version);
            try { File.Delete(zipPath); } catch { }
        }
        return WwwDir;
    }

    // ─── سرویس‌دهندهٔ لوکال روی 127.0.0.1:47231 (منشأ ثابتِ دادهٔ کاربر) ───
    private static string StartServer(string root)
    {
        var listener = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, Port);
        listener.Start();
        _ = Task.Run(async () =>
        {
            while (true)
            {
                try
                {
                    var client = await listener.AcceptTcpClientAsync();
                    _ = Task.Run(() => Serve(client, root));
                }
                catch
                {
                    break;
                }
            }
        });
        return "http://127.0.0.1:" + Port + "/index.html";
    }

    private static void Serve(System.Net.Sockets.TcpClient client, string root)
    {
        try
        {
            using (client)
            {
                var stream = client.GetStream();
                stream.ReadTimeout = 15000;
                string request = ReadRequest(stream);
                if (string.IsNullOrEmpty(request)) return;
                string path = request.Split(' ')[1];
                path = Uri.UnescapeDataString(path);
                int q = path.IndexOf('?');
                if (q >= 0) path = path[..q];
                if (path.Length == 0 || path == "/") path = "/index.html";
                if (path.StartsWith('/')) path = path[1..];
                if (path.Contains(".."))
                {
                    SendSimple(stream, 404, "text/plain", "not found");
                    return;
                }
                string full = Path.GetFullPath(Path.Combine(root, path.Replace('/', '\\')));
                if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !File.Exists(full))
                {
                    SendSimple(stream, 404, "text/plain", "not found");
                    return;
                }
                byte[] body = File.ReadAllBytes(full);
                string mime = MimeFor(Path.GetExtension(full).ToLowerInvariant());
                string header = "HTTP/1.1 200 OK\r\n" +
                                "Content-Type: " + mime + "\r\n" +
                                "Content-Length: " + body.Length + "\r\n" +
                                "Cache-Control: no-cache\r\n" +
                                "Connection: close\r\n\r\n";
                byte[] hb = Encoding.ASCII.GetBytes(header);
                stream.Write(hb, 0, hb.Length);
                stream.Write(body, 0, body.Length);
                stream.Flush();
            }
        }
        catch
        {
            // اتصال لوکال — در خطا فقط ببند
        }
    }

    private static string ReadRequest(System.Net.Sockets.NetworkStream stream)
    {
        var buf = new byte[8192];
        var sb = new StringBuilder();
        int total = 0;
        while (total < buf.Length)
        {
            int n = stream.Read(buf, 0, buf.Length);
            if (n <= 0) break;
            sb.Append(Encoding.ASCII.GetString(buf, 0, n));
            total += n;
            if (sb.ToString().Contains("\r\n\r\n")) break;
        }
        return sb.ToString();
    }

    private static void SendSimple(System.Net.Sockets.NetworkStream stream, int code, string mime, string text)
    {
        byte[] body = Encoding.UTF8.GetBytes(text);
        string header = "HTTP/1.1 " + code + " -\r\n" +
                        "Content-Type: " + mime + "\r\n" +
                        "Content-Length: " + body.Length + "\r\n" +
                        "Connection: close\r\n\r\n";
        byte[] hb = Encoding.ASCII.GetBytes(header);
        stream.Write(hb, 0, hb.Length);
        stream.Write(body, 0, body.Length);
        stream.Flush();
    }

    private static string MimeFor(string ext) => ext switch
    {
        ".html" or ".htm" => "text/html; charset=utf-8",
        ".js" or ".mjs" => "text/javascript; charset=utf-8",
        ".css" => "text/css; charset=utf-8",
        ".json" => "application/json; charset=utf-8",
        ".txt" => "text/plain; charset=utf-8",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".svg" => "image/svg+xml",
        ".webp" => "image/webp",
        ".avif" => "image/avif",
        ".ico" => "image/x-icon",
        ".woff" => "font/woff",
        ".woff2" => "font/woff2",
        ".ttf" => "font/ttf",
        ".otf" => "font/otf",
        ".webmanifest" => "application/manifest+json",
        ".mp3" => "audio/mpeg",
        ".wav" => "audio/wav",
        ".mp4" => "video/mp4",
        ".map" => "application/json",
        _ => "application/octet-stream",
    };

    // ─── تشخیص WebView2 Runtime (API رسمی + رجیستری + پوشه‌های استاندارد + دیالوگ) ───
    private static string EnsureWebView2Runtime()
    {
        if (TryFindRuntime(out string found)) return found;

        while (true)
        {
            var res = MessageBox.Show(
                "برای اجرای LaserCalc به «WebView2 Runtime» مایکروسافت نیاز است، ولی روی این سیستم پیدا نشد.\n\n" +
                "با «تلاش دوباره»، صفحهٔ رسمی دانلود مایکروسافت باز می‌شود؛ پس از نصب، دوباره روی «تلاش دوباره» بزنید تا برنامه اجرا شود.\n" +
                "(دانلود چند مگابایت است و فقط یک‌بار برای همیشه)",
                "WebView2 Runtime",
                MessageBoxButtons.RetryCancel,
                MessageBoxIcon.Warning,
                MessageBoxDefaultButton.Button1,
                MessageBoxOptions.RtlReading | MessageBoxOptions.RightAlign);
            if (res != DialogResult.Retry) Environment.Exit(0);
            try
            {
                Process.Start(new ProcessStartInfo("https://go.microsoft.com/fwlink/p/?LinkId=2124703")
                {
                    UseShellExecute = true,
                });
            }
            catch { }
            if (TryFindRuntime(out found)) return found;
        }
    }

    private static bool TryFindRuntime(out string runtimeDir)
    {
        // ۱) API رسمی خود WebView2 (با WebView2Loader.dllِ از پیش بارگذاری‌شده)
        try
        {
            var v = Microsoft.Web.WebView2.Core.CoreWebView2Environment.GetAvailableBrowserVersionString();
            if (!string.IsNullOrWhiteSpace(v))
            {
                runtimeDir = null!;
                return true; // کشف پیش‌فرض خودش کار می‌کند
            }
        }
        catch { }

        // ۲) رجیستری (نصب سیستمی و کاربرِ فعلی)
        string? pv = null;
        foreach (var key in new[]
        {
            @"HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            @"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
            @"HKEY_CURRENT_USER\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
        })
        {
            pv = Microsoft.Win32.Registry.GetValue(key, "pv", null) as string;
            if (!string.IsNullOrWhiteSpace(pv)) break;
        }

        // ۳) پوشه‌های استاندارد نصب
        string[] roots =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "EdgeWebView", "Application"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "EdgeWebView", "Application"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft", "EdgeWebView", "Application"),
        };
        foreach (var root in roots)
        {
            if (!Directory.Exists(root)) continue;
            // اگر pv از رجیستری آمد، اول همان نسخه
            if (!string.IsNullOrWhiteSpace(pv))
            {
                string cand = Path.Combine(root, pv);
                if (File.Exists(Path.Combine(cand, "msedgewebview2.exe")))
                {
                    runtimeDir = cand;
                    return true;
                }
            }
            foreach (var sub in Directory.GetDirectories(root))
            {
                if (File.Exists(Path.Combine(sub, "msedgewebview2.exe")))
                {
                    runtimeDir = sub;
                    return true;
                }
            }
        }

        runtimeDir = null!;
        return false;
    }

    // ─── دیالوگ خطای نهایی با جزئیات کامل (برای عکس گرفتن و ارسال) ───
    private static void Fatal(Exception ex)
    {
        var sb = new StringBuilder();
        sb.AppendLine("خطا در اجرای برنامه!");
        sb.AppendLine();
        sb.AppendLine(ex.GetType().FullName + ": " + ex.Message);
        var inner = ex.InnerException;
        while (inner != null)
        {
            sb.AppendLine("↳ " + inner.GetType().FullName + ": " + inner.Message);
            inner = inner.InnerException;
        }
        try
        {
            var frames = new StackTrace(ex, true).GetFrames();
            if (frames != null)
            {
                sb.AppendLine();
                int shown = 0;
                foreach (var f in frames)
                {
                    var m = f.GetMethod();
                    if (m == null) continue;
                    string file = f.GetFileName();
                    sb.AppendLine("   at " + (m.DeclaringType?.FullName ?? "?") + "." + m.Name
                        + (file != null ? " (" + Path.GetFileName(file) + ":" + f.GetFileLineNumber() + ")" : ""));
                    if (++shown >= 4) break;
                }
            }
        }
        catch { }
        sb.AppendLine();
        sb.AppendLine("نسخهٔ LaserCalc " + Version + " — از این پیام عکس بگیرید و بفرستید.");
        MessageBox.Show(
            sb.ToString(),
            "LaserCalc",
            MessageBoxButtons.OK,
            MessageBoxIcon.Error,
            MessageBoxDefaultButton.Button1,
            MessageBoxOptions.RtlReading | MessageBoxOptions.RightAlign);
    }
}

// ─── فرم میزبان: WebView2 تمام‌صفحه ───
internal class HostForm : Form
{
    public HostForm(Microsoft.Web.WebView2.Core.CoreWebView2Environment env, string url)
    {
        Text = "LaserCalc";
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(900, 600);
        try
        {
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        }
        catch { }

        var wv = new Microsoft.Web.WebView2.WinForms.WebView2
        {
            Dock = DockStyle.Fill,
        };
        Controls.Add(wv);

        Load += async (s, e) =>
        {
            try
            {
                await wv.EnsureCoreWebView2Async(env);
                wv.CoreWebView2.DocumentTitleChanged += (s2, e2) =>
                {
                    string t = wv.CoreWebView2.DocumentTitle;
                    Text = string.IsNullOrWhiteSpace(t) ? "LaserCalc" : t;
                };
                wv.Source = new Uri(url);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "خطا در بارگذاری موتور نمایش:\n" + ex.GetType().FullName + ": " + ex.Message,
                    "LaserCalc", MessageBoxButtons.OK, MessageBoxIcon.Error,
                    MessageBoxDefaultButton.Button1,
                    MessageBoxOptions.RtlReading | MessageBoxOptions.RightAlign);
                Close();
            }
        };
    }
}
