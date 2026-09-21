"""Original ERS theme: 16 bars in D minor, synthesized sax lead and orchestra.
Rebuild: python3 music-source/compose.py, then encode the output WAV with ffmpeg.
"""
from pathlib import Path
import numpy as np
from scipy.io.wavfile import write
S=32000; beat=60/104; duration=64*beat
N=int(duration*S); mix=np.zeros((N,2)); rng=np.random.default_rng(12)
def hz(n):return 440*2**((n-69)/12)
def add(a,start,gain=1,pan=0):
 idx=(np.arange(len(a))+int(start*S))%N
 np.add.at(mix[:,0],idx,a*gain*np.sqrt((1-pan)/2))
 np.add.at(mix[:,1],idx,a*gain*np.sqrt((1+pan)/2))
def env(t,d,attack=.025,release=.12):return np.minimum(1,t/attack)*np.minimum(1,np.maximum(0,d-t)/release)
def sax(note,start,beats,amp=.23):
 d=beats*beat*.94;t=np.arange(int(d*S))/S;f=hz(note)
 vib=(1-np.exp(-t*4))*.004*np.sin(2*np.pi*5.3*t)
 phase=2*np.pi*np.cumsum(f*(1+vib-.016*np.exp(-t*35)))/S
 a=np.zeros(len(t))
 for k in range(1,17):
  form=1+.8*np.exp(-((k*f-1100)/650)**2)
  a+=np.sin(k*phase)*np.exp(-k/8)*form/(k**.85)
 a=np.tanh(a*.7)*env(t,d,.035,.12)*(1+.03*np.sin(2*np.pi*3*t))
 a+=rng.normal(0,.014,len(t))*env(t,d,.04,.1)
 add(a,start,.7*amp,-.08)
 for delay,g,p in [(.12,.09,.5),(.23,.06,-.5),(.36,.035,.2)]:add(a,start+delay,g*amp,p)
def strings(notes,start,d):
 t=np.arange(int(d*S))/S;a=np.zeros(len(t))
 for n in notes:
  for det in [-.0018,.0018]:
   for k in range(1,6):a+=np.sin(2*np.pi*hz(n)*(1+det)*k*t+ .008*np.sin(t*29))/(k*len(notes)*2)
 add(a*env(t,d,.3,.45),start,.105, .45)
def bass(n,start,d):
 t=np.arange(int(d*S))/S;a=(np.sin(2*np.pi*hz(n)*t)+.25*np.sin(4*np.pi*hz(n)*t))*env(t,d,.015,.15)
 add(a,start,.17,-.15)
def drum(start,strong=False):
 d=.75;t=np.arange(int(d*S))/S;phase=2*np.pi*(48*t+65*.028*(1-np.exp(-t/.028)))
 a=np.sin(phase)*np.exp(-t*7)+rng.normal(0,.1,len(t))*np.exp(-t*65)
 add(a,start,.34 if strong else .22)
def snare(start):
 t=np.arange(int(.25*S))/S;noise=rng.normal(0,1,len(t));a=(noise-np.roll(noise,1))*.22*np.exp(-t*19)+np.sin(2*np.pi*175*t)*np.exp(-t*25)*.2
 add(a,start,.19,.2)
chords=[(38,[62,65,69]),(34,[58,62,65]),(41,[60,65,69]),(36,[60,64,67])]*3+[(34,[58,62,65]),(36,[60,64,67]),(33,[61,64,69]),(38,[62,65,69])]
melodies=[[(69,0,1.5),(72,1.5,.5),(74,2,1.5),(72,3.5,.5)],[(70,0,1),(69,1,.5),(65,1.5,.5),(62,2,1.75)],[(65,0,.75),(69,1,.75),(72,2,1),(77,3,.75)],[(76,0,1.5),(72,1.5,.5),(67,2,1.5)],[(69,0,.5),(72,.5,.5),(74,1,2),(77,3,.75)],[(77,0,1),(74,1,1),(70,2,1),(69,3,.75)],[(72,0,1.5),(69,1.5,.5),(65,2,1.5)],[(67,0,1),(64,1,.75),(60,2,1.75)],[(74,0,1.5),(77,1.5,.5),(81,2,1.5)],[(82,0,1),(81,1,.5),(77,1.5,.5),(74,2,1.5)],[(77,0,1),(81,1,1),(79,2,.5),(77,2.5,.5),(72,3,.75)],[(76,0,2),(79,2,1),(76,3,.75)],[(77,0,1.5),(74,1.5,.5),(70,2,1.5)],[(76,0,1),(72,1,.75),(67,2,1.5)],[(73,0,1),(76,1,1),(81,2,1.5)],[(77,0,.5),(76,.5,.5),(74,1,2.6)]]
for bar,(root,chord) in enumerate(chords):
 start=bar*4*beat;strings(chord,start,4*beat)
 for b in range(4):
  bass(root,start+b*beat,beat*.85);drum(start+b*beat,b in [0,2])
  if b in [1,3]:snare(start+b*beat)
 for note,b,d in melodies[bar]:sax(note,start+b*beat,d,.25 if bar>=8 else .21)
 # Quiet repeated high strings add cinematic motion.
 for e in range(8):
  t=np.arange(int(.22*S))/S;note=chord[e%3]+12;a=np.sin(2*np.pi*hz(note)*t)*np.exp(-t*16)*env(t,.22,.01,.05)
  add(a,start+e*beat/2,.035,(-1)**e*.55)
# A short stereo room, folded around the loop boundary.
wet=mix.copy()
for delay,g in [(.071,.11),(.137,.08),(.211,.055),(.317,.035)]:wet+=np.roll(mix[:,::-1],int(delay*S),axis=0)*g
wet=np.tanh(wet*1.3);wet*=.86/max(np.max(np.abs(wet)),.001)
output = Path(__file__).resolve().parent / 'ers-theme.wav'
write(str(output),S,(wet*32767).astype(np.int16))
print(f'Composed {duration:.2f}s original looping instrumental; peak {np.max(np.abs(wet)):.2f}')
