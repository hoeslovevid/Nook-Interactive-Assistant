package com.nook.phone;
import android.content.Context;import android.graphics.*;import android.view.View;
public final class PetView extends View {
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);private final Path path=new Path();private boolean animate=true;private String mood="idle";
    public PetView(Context c){super(c);setContentDescription("Nook companion");setOnClickListener(v->{mood="happy";invalidate();postDelayed(()->{mood="idle";invalidate();},1000);});}
    public void mood(String mood){this.mood=mood;invalidate();}
    @Override protected void onWindowVisibilityChanged(int visibility){super.onWindowVisibilityChanged(visibility);animate=visibility==VISIBLE;}
    @Override protected void onDraw(Canvas c){super.onDraw(c);float scale=Math.min(getWidth(),getHeight())/48f;c.save();c.scale(scale,scale);long now=android.os.SystemClock.uptimeMillis();float breath=animate?(float)Math.sin(now/900.0)*.2f:0;c.translate(0,breath);path.reset();path.moveTo(24,5);path.cubicTo(29,12,40,16,40,29);path.cubicTo(40,40,33,44,24,44);path.cubicTo(15,44,8,40,8,29);path.cubicTo(8,18,17,12,24,5);paint.setColor(Color.rgb(237,240,246));c.drawPath(path,paint);paint.setColor(Color.rgb(22,25,34));boolean blink=now%4700>4530;for(int x:new int[]{18,30})c.drawOval(x-2.4f,blink?26:23,x+2.4f,blink?27:30,paint);paint.setColor(Color.rgb(183,198,255));if(!blink)for(int x:new int[]{18,30})c.drawCircle(x,27,1.2f,paint);paint.setColor(Color.rgb(22,25,34));paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(1);path.reset();path.moveTo(21,34);path.quadTo(24,mood.equals("happy")?38:36,27,34);c.drawPath(path,paint);paint.setStyle(Paint.Style.FILL);c.restore();if(animate&&android.animation.ValueAnimator.areAnimatorsEnabled())postInvalidateDelayed(67);}
}
