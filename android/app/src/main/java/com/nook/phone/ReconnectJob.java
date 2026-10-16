package com.nook.phone;
import android.app.job.*;import android.content.*;
/** Optional, inexact 15-minute checks. Android may delay these while idle. */
public final class ReconnectJob extends JobService {
 private Thread worker;
 static void enable(Context c,boolean enabled){c.getSharedPreferences("nook",0).edit().putBoolean("background",enabled).apply();JobScheduler scheduler=(JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);scheduler.cancel(4812);if(enabled)scheduler.schedule(new JobInfo.Builder(4812,new ComponentName(c,ReconnectJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(15*60*1000).setPersisted(true).build());}
 @Override public boolean onStartJob(JobParameters p){worker=new Thread(()->{try{NookApi api=new NookApi(this);if(api.paired()&&getSharedPreferences("nook",0).getBoolean("background",false))NookWidget.updateState(this,api.request("/state","GET",null));}catch(Exception e){NookWidget.update(this,"Disconnected");}finally{jobFinished(p,false);}});worker.start();return true;}
 @Override public boolean onStopJob(JobParameters p){if(worker!=null)worker.interrupt();return true;}
}
