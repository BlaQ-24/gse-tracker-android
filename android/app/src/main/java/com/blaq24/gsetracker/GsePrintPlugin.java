package com.blaq24.gsetracker;

import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Prints the tracker's own WebView through Android's print service. The page has already switched to its
 * print layout (body.printing), so the job contains the monthly report; "Save as PDF" is one of the printers.
 * Resolves when the print dialog closes, so the page can leave print layout.
 */
@CapacitorPlugin(name = "GsePrint")
public class GsePrintPlugin extends Plugin {

    @PluginMethod
    public void print(final PluginCall call) {
        final String name = call.getString("name", "GSE Portfolio Report");
        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                final PrintDocumentAdapter inner = webView.createPrintDocumentAdapter(name);
                PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
                    @Override
                    public void onStart() { inner.onStart(); }

                    @Override
                    public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes, CancellationSignal cancellationSignal,
                                         LayoutResultCallback callback, Bundle extras) {
                        inner.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
                    }

                    @Override
                    public void onWrite(PageRange[] pages, ParcelFileDescriptor destination, CancellationSignal cancellationSignal,
                                        WriteResultCallback callback) {
                        inner.onWrite(pages, destination, cancellationSignal, callback);
                    }

                    @Override
                    public void onFinish() {
                        inner.onFinish();
                        JSObject ret = new JSObject();
                        ret.put("done", true);
                        call.resolve(ret);
                    }
                };
                PrintAttributes attrs = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .build();
                pm.print(name, adapter, attrs);
            } catch (Exception e) {
                call.reject("Printing failed: " + e.getMessage());
            }
        });
    }
}
