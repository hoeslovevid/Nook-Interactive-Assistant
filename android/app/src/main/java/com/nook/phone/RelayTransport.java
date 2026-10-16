package com.nook.phone;
import org.json.*;import java.net.*;import java.io.*;import java.nio.charset.StandardCharsets;import java.security.*;import java.util.*;import javax.crypto.*;import javax.crypto.spec.*;import android.util.Base64;
final class RelayTransport {
 static String origin(String value)throws Exception{URI u=new URI(value);if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||u.getQuery()!=null||u.getFragment()!=null||!(u.getPath().isEmpty()||u.getPath().equals("/")))throw new Exception("Invalid relay address.");return value.replaceAll("/$","");}
 static JSONObject crypt(String token,String id,String direction,JSONObject input,boolean encrypt)throws Exception{
  byte[] key=MessageDigest.getInstance("SHA-256").digest(("NookRelay1:"+token+":"+direction).getBytes(StandardCharsets.UTF_8)),iv;
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");if(encrypt){iv=new byte[12];new SecureRandom().nextBytes(iv);}else{iv=Base64.decode(input.getString("iv"),Base64.NO_WRAP);if(iv.length!=12)throw new Exception("Invalid relay response.");}
  cipher.init(encrypt?Cipher.ENCRYPT_MODE:Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));cipher.updateAAD((id+":"+direction).getBytes(StandardCharsets.UTF_8));
  if(encrypt)return new JSONObject().put("iv",Base64.encodeToString(iv,Base64.NO_WRAP)).put("data",Base64.encodeToString(cipher.doFinal(input.toString().getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP));
  return new JSONObject(new String(cipher.doFinal(Base64.decode(input.getString("data"),Base64.NO_WRAP)),StandardCharsets.UTF_8));
 }
 static JSONObject call(JSONObject config,String route,JSONObject body)throws Exception{
  HttpURLConnection c=(HttpURLConnection)new URL(origin(config.getString("url"))+route).openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(8000);c.setReadTimeout(15000);c.setRequestMethod("POST");c.setRequestProperty("Authorization","Bearer "+config.getString("access"));c.setRequestProperty("Content-Type","application/json");c.setDoOutput(true);
  try{try(OutputStream out=c.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}int status=c.getResponseCode();if(status>=300)throw new Exception(status==401?"Relay pairing expired. Reconnect on local Wi-Fi.":"Relay could not complete this request.");ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){if(bytes.size()+n>3000000)throw new Exception("Relay response too large.");bytes.write(b,0,n);}}return new JSONObject(bytes.toString(StandardCharsets.UTF_8.name()));}finally{c.disconnect();}
 }
 static JSONObject request(JSONObject config,String token,String path,String method,JSONObject body)throws Exception{
  String id=UUID.randomUUID().toString();JSONObject payload=new JSONObject().put("time",System.currentTimeMillis()).put("path",path).put("method",method).put("body",body==null?new JSONObject():body);
  call(config,"/phone/send",new JSONObject().put("id",id).put("envelope",crypt(token,id,"request",payload,true)));
  long until=System.currentTimeMillis()+(path.equals("/chat")?140000:25000);
  while(System.currentTimeMillis()<until){Thread.sleep(1000);JSONObject r=call(config,"/phone/result",new JSONObject().put("id",id));if(r.has("envelope")){JSONObject data=crypt(token,id,"response",r.getJSONObject("envelope"),false);if(Math.abs(System.currentTimeMillis()-data.getLong("time"))>180000)throw new Exception("Expired relay response.");JSONObject result=data.getJSONObject("body");if(data.getInt("status")>=300)throw new Exception(result.optString("error","PC request failed."));return result;}}
  throw new Exception("PC did not respond. Check Nook is running. Review the latest state before retrying an action.");
 }
}
