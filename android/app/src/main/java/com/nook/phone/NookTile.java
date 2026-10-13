package com.nook.phone;
import android.app.PendingIntent;import android.content.Intent;import android.os.Build;import android.service.quicksettings.*;
public final class NookTile extends TileService {
    @Override public void onStartListening(){super.onStartListening();Tile tile=getQsTile();tile.setLabel("Nook");tile.setState(Tile.STATE_INACTIVE);tile.updateTile();}
    @Override public void onClick(){super.onClick();Intent intent=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);if(Build.VERSION.SDK_INT>=34)startActivityAndCollapse(PendingIntent.getActivity(this,0,intent,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT));else startActivityAndCollapse(intent);}
}
