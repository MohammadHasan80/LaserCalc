package com.mohammadhasan.lasercut;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.hardware.fingerprint.FingerprintManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * اپ LaserCalc — نسخه اندروید
 * وب‌اپ به صورت کاملاً آفلاین داخل WebView اجرا می‌شود؛
 * یک وب‌سرور محلی روی 127.0.0.1 دارایی‌های بسته‌بندی‌شده را سرو می‌کند.
 * پل AndroidBridge.savePdf فاکتور را در پوشه Downloads ذخیره می‌کند.
 */
public class MainActivity extends Activity {

    private static final int REQ_WRITE_STORAGE = 1001;
    private static final int REQ_FILE_CHOOSER = 1002;

    /** پورت ثابت وب‌سرور — پایداری origin برای localStorage (تم، فاکتورها، تنظیمات) */
    private static final int FIXED_PORT = 18080;

    private WebView webView;
    private ServerSocket serverSocket;
    private ExecutorService pool;
    private int port = -1;

    /** فایل در انتظار اجازه دسترسی (اندروید ۹ و پایین‌تر) */
    private byte[] pendingData;
    private String pendingName;

    /** کال‌بک انتخاب فایل (لوگو، فایل پشتیبان) */
    private ValueCallback<Uri[]> filePathCallback;

    /** سیگنال لغو احراز هویت زیستی در جریان */
    private CancellationSignal biometricCancel;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        // فقط نشانی‌های داخلی (وب‌سرور محلی) در خود WebView باز می‌شوند؛
        // هر نشانی بیرونی (مثل لینک تلگرام) با اپ مرتبط یا مرورگر خارجی باز می‌شود
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri uri = Uri.parse(url);
                String host = uri.getHost();
                if (host != null && host.equals("127.0.0.1")) {
                    return false; // ناوبری داخلی — خود WebView
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    // اپ/مرورگری برای این نشانی نصب نیست — نادیده بگیر
                }
                return true; // ناوبری بیرونی — WebView جاری دست‌نخورده بماند
            }
        });
        webView.setBackgroundColor(isDarkTheme() ? 0xFF0c0a09 : 0xFFf5f5f4);
        webView.addJavascriptInterface(new PdfBridge(), "AndroidBridge");
        webView.addJavascriptInterface(new BiometricBridge(), "BiometricBridge");

        // پشتیبانی از انتخاب فایل داخل صفحه (لوگوی فاکتور، فایل پشتیبان)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                try {
                    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    String[] types = params.getAcceptTypes();
                    String type = "*/*";
                    if (types != null && types.length > 0
                            && types[0] != null && !types[0].isEmpty()) {
                        type = types[0];
                    }
                    intent.setType(type);
                    startActivityForResult(
                            Intent.createChooser(intent, "انتخاب فایل"),
                            REQ_FILE_CHOOSER);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        // جلوگیری از انتخاب و کپی متن — لمس طولانی مصرف می‌شود و منویی باز نمی‌کند
        webView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return true;
            }
        });
        webView.setLongClickable(false);
        webView.setHapticFeedbackEnabled(false);

        startServer();
        if (port > 0) {
            webView.loadUrl("http://127.0.0.1:" + port + "/");
        }
    }

    /** پل جاوااسکریپت — ذخیره فایل در Downloads و نگهداشت تم برای پس‌زمینه اولیه */
    private class PdfBridge {

        @JavascriptInterface
        public String savePdf(String base64, String filename) {
            return saveFile(base64, filename, "application/pdf");
        }

        /** فایل پشتیبان JSON — ذخیره در Downloads */
        @JavascriptInterface
        public String saveJson(String base64, String filename) {
            return saveFile(base64, filename, "application/json");
        }

        @JavascriptInterface
        public void saveTheme(String theme) {
            if (theme == null) return;
            if (!"dark".equals(theme) && !"light".equals(theme)) return;
            getSharedPreferences("ui", MODE_PRIVATE)
                    .edit()
                    .putString("theme", theme)
                    .apply();
        }
    }

    /** پل جاوااسکریپت — ورود با اثر انگشت برای قفل برنامه */
    private class BiometricBridge {

        /** آیا احراز هویت زیستی در دسترس است؟ — "true" یا "false" */
        @JavascriptInterface
        public String canBiometric() {
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    BiometricManager bm = getSystemService(BiometricManager.class);
                    if (bm == null) return "false";
                    return bm.canAuthenticate(
                            BiometricManager.Authenticators.BIOMETRIC_WEAK)
                            == BiometricManager.BIOMETRIC_SUCCESS
                            ? "true" : "false";
                }
                if (Build.VERSION.SDK_INT >= 28) {
                    BiometricManager bm = getSystemService(BiometricManager.class);
                    if (bm == null) return "false";
                    return bm.canAuthenticate()
                            == BiometricManager.BIOMETRIC_SUCCESS
                            ? "true" : "false";
                }
                // اندروید ۷ و ۸ — FingerprintManager
                FingerprintManager fm = getSystemService(FingerprintManager.class);
                if (fm == null) return "false";
                return (fm.isHardwareDetected()
                        && fm.hasEnrolledFingerprints())
                        ? "true" : "false";
            } catch (Exception e) {
                return "false";
            }
        }

        /** شروع احراز هویت — نتیجه با window.__biometricResult برمی‌گردد */
        @JavascriptInterface
        public void authenticateBiometric(final String title,
                final String subtitle) {
            final String t = (title == null || title.isEmpty())
                    ? "ورود" : title;
            final String s = (subtitle == null) ? "" : subtitle;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    startBiometricAuth(t, s);
                }
            });
        }
    }

    /** اجرای احراز هویت زیستی — API ۲۸+: BiometricPrompt، پایین‌تر: FingerprintManager */
    private void startBiometricAuth(String title, String subtitle) {
        cancelBiometric();
        final CancellationSignal signal = new CancellationSignal();
        biometricCancel = signal;

        if (Build.VERSION.SDK_INT >= 28) {
            BiometricPrompt.Builder builder =
                    new BiometricPrompt.Builder(this)
                            .setTitle(title)
                            .setNegativeButton("انصراف", getMainExecutor(),
                                    new DialogInterface.OnClickListener() {
                                        @Override
                                        public void onClick(DialogInterface d, int w) {
                                            biometricCancel = null;
                                            notifyBiometric("cancel");
                                        }
                                    });
            if (!subtitle.isEmpty()) builder.setSubtitle(subtitle);
            BiometricPrompt prompt = builder.build();
            prompt.authenticate(signal, getMainExecutor(),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(
                                BiometricPrompt.AuthenticationResult result) {
                            biometricCancel = null;
                            notifyBiometric("success");
                        }

                        @Override
                        public void onAuthenticationError(int code,
                                CharSequence errString) {
                            biometricCancel = null;
                            // ۴ = دکمه منفی، ۵ = لغو کاربر — خطا حساب نمی‌شود
                            notifyBiometric(code == 4 || code == 5
                                    ? "cancel" : "error");
                        }
                    });
        } else {
            try {
                FingerprintManager fm =
                        getSystemService(FingerprintManager.class);
                if (fm == null || !fm.isHardwareDetected()) {
                    notifyBiometric("error");
                    return;
                }
                fm.authenticate(null, signal, 0,
                        new FingerprintManager.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(
                                    FingerprintManager.AuthenticationResult result) {
                                biometricCancel = null;
                                notifyBiometric("success");
                            }

                            @Override
                            public void onAuthenticationError(int code,
                                    CharSequence errString) {
                                biometricCancel = null;
                                notifyBiometric(code == 4 || code == 5
                                        ? "cancel" : "error");
                            }
                        },
                        new android.os.Handler(
                                android.os.Looper.getMainLooper()));
            } catch (Exception e) {
                biometricCancel = null;
                notifyBiometric("error");
            }
        }
    }

    private void cancelBiometric() {
        if (biometricCancel != null) {
            try {
                biometricCancel.cancel();
            } catch (Exception ignored) {
            }
            biometricCancel = null;
        }
    }

    /** گزارش نتیجه به صفحهٔ وب */
    private void notifyBiometric(final String status) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (webView == null) return;
                webView.evaluateJavascript(
                        "window.__biometricResult&&window.__biometricResult('"
                                + status + "');", null);
            }
        });
    }

    /** تم فعلی برای رنگ پس‌زمینه WebView — از SharedPreferences، سپس تم سیستم */
    private boolean isDarkTheme() {
        SharedPreferences sp = getSharedPreferences("ui", MODE_PRIVATE);
        String t = sp.getString("theme", "");
        if ("dark".equals(t)) return true;
        if ("light".equals(t)) return false;
        int mask = getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK;
        return mask == Configuration.UI_MODE_NIGHT_YES;
    }

    /** ذخیره بایت‌های base64 در Downloads — خروجی: ok / error / permission */
    private String saveFile(String base64, String filename, String mime) {
        if (base64 == null || base64.isEmpty() || filename == null
                || filename.isEmpty() || filename.contains("/")) {
            return "error";
        }
        byte[] data;
        try {
            data = Base64.decode(base64, Base64.DEFAULT);
        } catch (Exception e) {
            return "error";
        }
        if (data.length == 0) return "error";

        if (Build.VERSION.SDK_INT >= 29) {
            return saveViaMediaStore(data, filename, mime);
        }
        // اندروید ۹ و پایین‌تر — نیاز به اجازه WRITE_EXTERNAL_STORAGE
        if (checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)
                == PackageManager.PERMISSION_GRANTED) {
            return writeLegacy(data, filename) ? "ok" : "error";
        }
        pendingData = data;
        pendingName = filename;
        requestPermissions(
                new String[]{android.Manifest.permission.WRITE_EXTERNAL_STORAGE},
                REQ_WRITE_STORAGE);
        return "permission";
    }

    /** اندروید ۱۰ به بالا — MediaStore Downloads بدون نیاز به اجازه */
    private String saveViaMediaStore(byte[] data, String filename, String mime) {
        try {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Downloads.DISPLAY_NAME, uniqueName(filename));
            cv.put(MediaStore.Downloads.MIME_TYPE, mime);
            cv.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri uri = getContentResolver()
                    .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) return "error";
            OutputStream os = getContentResolver().openOutputStream(uri);
            if (os == null) {
                getContentResolver().delete(uri, null, null);
                return "error";
            }
            os.write(data);
            os.flush();
            os.close();
            ContentValues done = new ContentValues();
            done.put(MediaStore.Downloads.IS_PENDING, 0);
            getContentResolver().update(uri, done, null, null);
            notifySaved();
            return "ok";
        } catch (Exception e) {
            return "error";
        }
    }

    /** اندروید ۹ و پایین‌تر — مسیر کلاسیک Downloads */
    private boolean writeLegacy(byte[] data, String filename) {
        try {
            File dir = Environment
                    .getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, uniqueName(filename));
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(data);
            fos.flush();
            fos.close();
            MediaScannerConnection.scanFile(this,
                    new String[]{file.getAbsolutePath()}, null, null);
            notifySaved();
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    /** اگر نام تکراری بود، شماره (۱) و (۲) … اضافه می‌کند */
    private String uniqueName(String filename) {
        String base = filename;
        String ext = "";
        int dot = filename.lastIndexOf('.');
        if (dot > 0) {
            base = filename.substring(0, dot);
            ext = filename.substring(dot);
        }
        File dir = Environment
                .getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!dir.exists()) dir.mkdirs();
        String candidate = filename;
        int i = 1;
        while (new File(dir, candidate).exists()) {
            candidate = base + " (" + i + ")" + ext;
            i++;
        }
        return candidate;
    }

    private void notifySaved() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(MainActivity.this,
                        "در پوشه Downloads ذخیره شد", Toast.LENGTH_LONG).show();
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode,
            Intent data) {
        if (requestCode != REQ_FILE_CHOOSER) return;
        if (filePathCallback == null) return;
        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) {
            results = new Uri[]{data.getData()};
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode,
            String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_WRITE_STORAGE) return;
        if (grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED
                && pendingData != null) {
            final byte[] data = pendingData;
            final String name = pendingName;
            pendingData = null;
            pendingName = null;
            new Thread(new Runnable() {
                @Override
                public void run() {
                    final boolean ok = writeLegacy(data, name);
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(MainActivity.this,
                                    ok ? "در پوشه Downloads ذخیره شد"
                                       : "ذخیره ناموفق بود",
                                    Toast.LENGTH_LONG).show();
                        }
                    });
                }
            }).start();
        } else {
            pendingData = null;
            pendingName = null;
            Toast.makeText(this, "اجازه ذخیره‌سازی داده نشد", Toast.LENGTH_LONG).show();
        }
    }

    /** راه‌اندازی وب‌سرور محلی (فقط روی loopback) */
    private void startServer() {
        pool = Executors.newFixedThreadPool(8);
        // پورت ثابت: origin از http://127.0.0.1:18080 در هر اجرا یکسان می‌ماند؛
        // در غیر این صورت localStorage (تم و تاریخچه فاکتور) بین اجراها پاک می‌شود
        for (int attempt = 0; attempt < 3 && port < 0; attempt++) {
            try {
                serverSocket = new ServerSocket(FIXED_PORT, 64,
                        InetAddress.getByName("127.0.0.1"));
                port = FIXED_PORT;
            } catch (IOException e) {
                try {
                    Thread.sleep(150);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        if (port < 0) {
            // فقط اگر پورت ثابت واقعاً اشغال بود — پورت تصادفی (در این حالت نادر،
            // حافظه محلی همین یک اجرا مثل بار اول خالی است)
            try {
                serverSocket = new ServerSocket(0, 64,
                        InetAddress.getByName("127.0.0.1"));
                port = serverSocket.getLocalPort();
            } catch (IOException e) {
                port = -1;
                return;
            }
        }
        Thread acceptThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (!serverSocket.isClosed()) {
                    try {
                        final Socket socket = serverSocket.accept();
                        pool.execute(new Runnable() {
                            @Override
                            public void run() {
                                handleConnection(socket);
                            }
                        });
                    } catch (IOException e) {
                        break;
                    }
                }
            }
        });
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    private void handleConnection(Socket socket) {
        try {
            socket.setSoTimeout(5000);
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();

            String requestLine = readLine(in);
            if (requestLine == null || requestLine.isEmpty()) return;
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) return;
            String method = parts[0];
            String rawPath = parts[1];

            // مصرف هدرهای درخواست
            while (true) {
                String line = readLine(in);
                if (line == null || line.isEmpty()) break;
            }

            if (rawPath.contains("?")) rawPath = rawPath.substring(0, rawPath.indexOf('?'));
            String path = URLDecoder.decode(rawPath, "UTF-8");
            if (path.startsWith("/")) path = path.substring(1);
            if (path.isEmpty()) path = "index.html";
            if (path.endsWith("/")) path = path + "index.html";
            if (path.contains("..")) {
                respond(out, "403 Forbidden", "text/plain; charset=utf-8",
                        "Forbidden".getBytes(StandardCharsets.UTF_8));
                return;
            }

            byte[] body = readAsset(path);
            String servedPath = path;
            if (body == null) {
                body = readAsset(path + "/index.html");
                if (body != null) servedPath = path + "/index.html";
            }
            if (body == null) {
                body = readAsset(path + ".html");
                if (body != null) servedPath = path + ".html";
            }
            if (body == null) {
                byte[] notFound = readAsset("404.html");
                if (notFound == null) notFound = "404".getBytes(StandardCharsets.UTF_8);
                respond(out, "404 Not Found", "text/html; charset=utf-8", notFound);
                return;
            }

            String cacheControl = servedPath.startsWith("_next/static/")
                    ? "public, max-age=31536000, immutable"
                    : "no-cache";
            StringBuilder header = new StringBuilder();
            header.append("HTTP/1.1 200 OK\r\n");
            header.append("Content-Type: ").append(guessMime(servedPath)).append("\r\n");
            header.append("Content-Length: ").append(body.length).append("\r\n");
            header.append("Cache-Control: ").append(cacheControl).append("\r\n");
            header.append("Connection: close\r\n\r\n");
            out.write(header.toString().getBytes(StandardCharsets.UTF_8));
            if (!method.equalsIgnoreCase("HEAD")) {
                out.write(body);
            }
            out.flush();
        } catch (Exception ignored) {
            // خطاهای اتصال نادیده گرفته می‌شوند
        } finally {
            try {
                socket.close();
            } catch (Exception ignored) {
            }
        }
    }

    private byte[] readAsset(String path) {
        try {
            InputStream is = getAssets().open(path);
            byte[] data = readAll(is);
            is.close();
            return data;
        } catch (IOException e) {
            return null;
        }
    }

    private String readLine(InputStream in) throws IOException {
        StringBuilder sb = new StringBuilder();
        int prev = -1, c;
        while ((c = in.read()) != -1) {
            if (prev == '\r' && c == '\n') {
                return sb.length() > 0 ? sb.substring(0, sb.length() - 1) : "";
            }
            sb.append((char) c);
            prev = c;
        }
        return sb.length() > 0 ? sb.toString() : null;
    }

    private byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) != -1) bos.write(buf, 0, n);
        return bos.toByteArray();
    }

    private void respond(OutputStream out, String status, String contentType, byte[] body)
            throws IOException {
        StringBuilder header = new StringBuilder();
        header.append("HTTP/1.1 ").append(status).append("\r\n");
        header.append("Content-Type: ").append(contentType).append("\r\n");
        header.append("Content-Length: ").append(body.length).append("\r\n");
        header.append("Connection: close\r\n\r\n");
        out.write(header.toString().getBytes(StandardCharsets.UTF_8));
        out.write(body);
        out.flush();
    }

    private String guessMime(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html; charset=utf-8";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css; charset=utf-8";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".gif")) return "image/gif";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".json") || p.endsWith(".map")) return "application/json";
        if (p.endsWith(".txt")) return "text/plain; charset=utf-8";
        if (p.endsWith(".webmanifest")) return "application/manifest+json";
        return "application/octet-stream";
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        cancelBiometric();
        if (webView != null) webView.destroy();
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {
            }
        }
        if (pool != null) pool.shutdownNow();
        super.onDestroy();
    }
}
