package com.blaq24.gsetracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GsePrintPlugin.class);   // the tracker's "Print / save PDF" report
        super.onCreate(savedInstanceState);
    }
}
