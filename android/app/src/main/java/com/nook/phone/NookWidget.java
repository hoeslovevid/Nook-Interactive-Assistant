package com.nook.phone;
import android.app.PendingIntent;import android.appwidget.*;import android.content.*;import android.widget.RemoteViews;
public final class NookWidget extends AppWidgetProvider {
    public static void update(Context c,String status){String previous=c.getSharedPreferences("nook",0).getString("status","");if(status.equals(previous))return;c.getSharedPreferences("nook",0).edit().putString("status",status).apply();AppWidgetManager m=AppWidgetManager.getInstance(c);render(c,m,m.getAppWidgetIds(new ComponentName(c,NookWidget.class)),status);}
    private static void render(Context c,AppWidgetManager m,int[] ids,String status){RemoteViews view=new RemoteViews(c.getPackageName(),R.layout.widget);view.setTextViewText(R.id.widget_status,status);view.setOnClickPendingIntent(R.id.widget_root,PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT));for(int id:ids)m.updateAppWidget(id,view);}
    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){render(c,m,ids,c.getSharedPreferences("nook",0).getString("status","Open Nook to connect"));}
}
