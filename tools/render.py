#!/usr/bin/env python3
"""Free local fallback. Requires Python 3 + native FFmpeg; no upload/service."""
import argparse, subprocess, pathlib, shutil
p=argparse.ArgumentParser(description='画像3枚と音声からH.264/AAC MP4を作る')
p.add_argument('--images',nargs=3,required=True)
p.add_argument('--seconds',nargs=3,type=int,default=[5,5,5])
p.add_argument('--audio',required=True)
p.add_argument('--height',type=int,choices=[720,1080],default=720)
p.add_argument('--output',default='slideshow.mp4')
a=p.parse_args()
if not shutil.which('ffmpeg'):p.error('FFmpegをインストールしてください。')
if any(s<1 or s>28 for s in a.seconds) or not 15<=sum(a.seconds)<=30:p.error('各1〜28秒・合計15〜30秒にしてください。')
for f in [*a.images,a.audio]:
    if not pathlib.Path(f).is_file():p.error(f'ファイルがありません: {f}')
cmd=['ffmpeg','-hide_banner','-nostdin','-n','-filter_complex_threads','1']
for image,seconds in zip(a.images,a.seconds):cmd+=['-loop','1','-framerate','30','-t',str(seconds),'-i',str(pathlib.Path(image).resolve())]
cmd+=['-i',str(pathlib.Path(a.audio).resolve())]
w=a.height*16//9;h=a.height
filters=[f'[{i}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p,setpts=PTS-STARTPTS[v{i}]' for i in range(3)]
filters+=['[v0][v1][v2]concat=n=3:v=1:a=0[v]',f'[3:a]apad,atrim=duration={sum(a.seconds)},asetpts=PTS-STARTPTS[a]']
cmd+=['-filter_complex',';'.join(filters),'-map','[v]','-map','[a]','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','160k','-t',str(sum(a.seconds)),'-movflags','+faststart',str(pathlib.Path(a.output).resolve())]
subprocess.run(cmd,check=True)
