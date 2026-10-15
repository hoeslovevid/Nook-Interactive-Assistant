package com.nook.phone;
import android.appwidget.AppWidgetManager;import android.content.Context;
public final class RequestsWidget extends NookWidget { @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){renderVariant(c,m,ids,c.getSharedPreferences("nook",0).getString("status","Open Nook"),"requests");} }
