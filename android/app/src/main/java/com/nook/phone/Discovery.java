package com.nook.phone;
import android.content.Context;import android.net.nsd.*;import java.util.*;import java.util.concurrent.*;
/** Discovery suggests an address; certificate pinning still authenticates it. */
final class Discovery {
 static List<String> find(Context context,String pin) throws InterruptedException {
  NsdManager nsd=(NsdManager)context.getSystemService(Context.NSD_SERVICE);List<String> results=Collections.synchronizedList(new ArrayList<>());CountDownLatch found=new CountDownLatch(1);
  NsdManager.DiscoveryListener listener=new NsdManager.DiscoveryListener(){
   public void onDiscoveryStarted(String type){} public void onDiscoveryStopped(String type){} public void onServiceLost(NsdServiceInfo service){}
   public void onStartDiscoveryFailed(String type,int code){found.countDown();}public void onStopDiscoveryFailed(String type,int code){}
   public void onServiceFound(NsdServiceInfo service){if(!service.getServiceName().startsWith("Nook-"+pin.substring(0,8)))return;nsd.resolveService(service,new NsdManager.ResolveListener(){public void onResolveFailed(NsdServiceInfo s,int code){}public void onServiceResolved(NsdServiceInfo s){try{byte[] fingerprint=s.getAttributes().get("pin");if(fingerprint!=null&&pin.equals(new String(fingerprint,java.nio.charset.StandardCharsets.UTF_8))&&s.getHost()!=null&&s.getHost().getAddress().length==4){String url="https://"+s.getHost().getHostAddress()+":"+s.getPort();NookApi.validate(url,pin);results.add(url);found.countDown();}}catch(Exception ignored){}}});}
  };
  try{nsd.discoverServices("_nook._tcp.",NsdManager.PROTOCOL_DNS_SD,listener);found.await(4,TimeUnit.SECONDS);}catch(RuntimeException ignored){}finally{try{nsd.stopServiceDiscovery(listener);}catch(RuntimeException ignored){}}
  return new ArrayList<>(results);
 }
}
