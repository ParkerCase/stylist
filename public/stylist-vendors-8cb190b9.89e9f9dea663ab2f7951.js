"use strict";(self.webpackChunkStylistWidget=self.webpackChunkStylistWidget||[]).push([[6689],{2750:function(e,t,n){n.d(t,{w:function(){return s}});var r=n(9495);function s(e,t,n,s){const a=r.util.parseAxisParam(t,n)[0],o=[1,n[0],1];for(let r=0;r<a;r++)o[0]*=n[r];o[1]=n[a];for(let r=a+1;r<n.length;r++)o[2]*=n[r];const u=new Map,c=new Int32Array(n[a]),i=new r.TensorBuffer(o,s,e),l=[],p=1===o[0]&&1===o[2];for(let r=0;r<n[a];r++){let t;if(p)t=e[r].toString();else{const e=[];for(let t=0;t<o[0];t++)for(let n=0;n<o[2];n++)e.push(i.get(t,r,n));t=e.join(",")}const n=u.get(t);if(null!=n)c[r]=n;else{const e=u.size;u.set(t,e),c[r]=e,l.push(r)}}const f=o.slice();f[1]=u.size;const d=new r.TensorBuffer(f,s);l.forEach(((e,t)=>{for(let n=0;n<o[0];n++)for(let r=0;r<o[2];r++)d.set(i.get(n,e,r),n,t,r)}));const h=n.slice();return h[a]=f[1],{outputValues:d.values,outputShape:h,indices:c}}},13396:function(e,t,n){n.d(t,{_:function(){return s}});var r=n(9495);function s(e,t,n,s,a){const o=t.length,u=r.util.sizeFromShape(t),c=r.util.computeStrides(t),i=r.util.computeStrides(a),l=r.util.getTypedArrayFromDType(n,r.util.sizeFromShape(a));for(let p=0;p<u;++p){const t=r.util.indexToLoc(p,o,c),n=new Array(t.length);for(let e=0;e<n.length;e++)n[e]=t[s[e]];l[r.util.locToIndex(n,o,i)]=e[p]}return l}},21671:function(e,t,n){n.d(t,{D:function(){return s}});var r=n(9495);function s(e,t){const n=new Array(e.rank);for(let r=0;r<n.length;r++)n[r]=e.shape[r]*t[r];const s=(0,r.buffer)(n,e.dtype);for(let r=0;r<s.values.length;++r){const t=s.indexToLoc(r),n=new Array(e.rank);for(let r=0;r<n.length;r++)n[r]=t[r]%e.shape[r];const a=e.locToIndex(n);s.values[r]=e.values[a]}return s}},29492:function(e,t,n){var r=n(9495),s=n(9949),a=n(95315),o=n(78140);const u={kernelName:r._FusedMatMul,backendName:"cpu",kernelFunc:function(e){const{inputs:t,backend:n,attrs:r}=e,{a:u,b:c,bias:i,preluActivationWeights:l}=t,{transposeA:p,transposeB:f,activation:d,leakyreluAlpha:h}=r;let k,m,b;const g=[];k=(0,o.N)({inputs:{a:u,b:c},attrs:{transposeA:p,transposeB:f},backend:n}),i&&(m=(0,a.WQ)({inputs:{a:k,b:i},backend:n}),g.push(k),k=m),d&&(b=(0,s.f)(n,k,d,l,h),g.push(k),k=b);for(const s of g)n.disposeIntermediateTensorInfo(s);return k}};var c=n(62680),i=n(96708),l=n(7478),p=n(91601),f=n(53747),d=n(30766),h=n(98828),k=n(25954),m=n(50745),b=n(36541),g=n(13484),y=n(7676),x=n(50046),v=n(1090),T=n(58449),I=n(87105),w=n(3822),M=n(58306),F=n(237),N=n(46838),S=n(94890),A=n(11402),C=n(13713),V=n(14759),z=n(66404),L=n(89436),W=n(63330),D=n(98342),j=n(43898),E=n(23530),$=n(33910),q=n(70583),K=n(45655),U=n(6941),Y=n(41347),Z=n(11355),_=n(55671),B=n(62590),O=n(50120),R=n(1903),X=n(57152),H=n(87994),J=n(14666),P=n(85046),Q=n(94505),G=n(69034),ee=n(25242),te=n(19910),ne=n(38168),re=n(36813),se=n(24856),ae=n(4652),oe=n(99292),ue=n(52999),ce=n(66423),ie=n(36085),le=n(26789),pe=n(89792),fe=n(80015),de=n(62684),he=n(85526),ke=n(95071),me=n(30307),be=n(99150),ge=n(50591),ye=n(11717),xe=n(14346),ve=n(86768),Te=n(46936),Ie=n(60251),we=n(18944),Me=n(71969),Fe=n(79727),Ne=n(27445),Se=n(456),Ae=n(45207),Ce=n(3087),Ve=n(19697),ze=n(1802),Le=n(98287),We=n(82486),De=n(94174),je=n(14578),Ee=n(34820),$e=n(49608),qe=n(99730),Ke=n(66114),Ue=n(6564),Ye=n(74575),Ze=n(18439),_e=n(57384),Be=n(998),Oe=n(96515),Re=n(98876),Xe=n(48580),He=n(14280),Je=n(17944),Pe=n(70213),Qe=n(65646),Ge=n(37962),et=n(63305),tt=n(7004),nt=n(4995),rt=n(97113),st=n(7761),at=n(95439),ot=n(9903),ut=n(94237),ct=n(56782),it=n(50666),lt=n(51675),pt=n(59623),ft=n(93287),dt=n(37089),ht=n(14565),kt=n(85806),mt=n(61879),bt=n(60990),gt=n(74016),yt=n(53652),xt=n(14590),vt=n(27882),Tt=n(83478),It=n(67296),wt=n(94260),Mt=n(5550),Ft=n(17714),Nt=n(12184),St=n(4092),At=n(96320),Ct=n(25441),Vt=n(91518),zt=n(10229),Lt=n(64904),Wt=n(35019),Dt=n(75166),jt=n(42180),Et=n(87906),$t=n(62282),qt=n(55758),Kt=n(43201),Ut=n(40259),Yt=n(67654),Zt=n(75320),_t=n(15194),Bt=n(96844),Ot=n(92292),Rt=n(63252),Xt=n(19105),Ht=n(10494),Jt=n(17985),Pt=n(94604),Qt=n(88105),Gt=n(5437),en=n(22615),tn=n(33442),nn=n(18566),rn=n(25231),sn=n(35615),an=n(24863),on=n(70704),un=n(97870),cn=n(21671);const ln={kernelName:r.Tile,backendName:"cpu",kernelFunc:function(e){const{inputs:t,backend:n,attrs:r}=e,{x:s}=t,{reps:a}=r;(0,un.C)(s,"tile");const o=(0,cn.D)(n.bufferSync(s),a);return n.makeTensorInfo(o.shape,o.dtype,o.values)}};var pn=n(53475);const fn={kernelName:r.TopK,backendName:"cpu",kernelFunc:function(e){const{inputs:t,backend:n,attrs:r}=e,{x:s}=t,{k:a,sorted:o}=r;(0,un.C)(s,"topk");const u=n.data.get(s.dataId).values,[c,i]=(0,pn.x)(u,s.shape,s.dtype,a,o);return[n.makeTensorInfo(c.shape,c.dtype,c.values),n.makeTensorInfo(i.shape,i.dtype,i.values)]}};const dn={kernelName:r.Transform,backendName:"cpu",kernelFunc:function(e){const{inputs:t,attrs:n,backend:s}=e,{image:a,transforms:o}=t,{interpolation:u,fillMode:c,fillValue:i,outputShape:l}=n,[p,f,d,h]=a.shape,[k,m]=null!=l?l:[f,d],b=[p,k,m,h],g=r.util.computeStrides(a.shape),y=g[0],x=g[1],v=g[2],T=r.util.computeStrides(b),I=T[0],w=T[1],M=T[2],F=r.util.getTypedArrayFromDType(a.dtype,r.util.sizeFromShape(b));F.fill(i);const N=s.data.get(a.dataId).values,S=s.data.get(o.dataId).values;for(let r=0;r<p;++r){const e=1===o.shape[0]?S:S.subarray(8*r,8*r+8);for(let t=0;t<k;++t)for(let n=0;n<m;++n)for(let s=0;s<h;++s){let a;const o=e[6]*n+e[7]*t+1;if(0===o)continue;const l=(e[0]*n+e[1]*t+e[2])/o,p=(e[3]*n+e[4]*t+e[5])/o,h=hn(l,d,c),k=hn(p,f,c);switch(u){case"nearest":a=mn(N,f,d,y,x,v,r,k,h,s,i);break;case"bilinear":a=bn(N,f,d,y,x,v,r,k,h,s,i);break;default:throw new Error(`Error in Transform: Expect 'nearest' or 'bilinear', but got ${u}`)}F[r*I+t*w+n*M+s]=a}return s.makeTensorInfo(b,a.dtype,F)}return{dataId:s.write(F,b,a.dtype),shape:a.shape,dtype:a.dtype}}};function hn(e,t,n){switch(n){case"reflect":return function(e,t){let n=e;if(n<0)if(t<=1)n=0;else{const e=2*t;n<e&&(n=e*Math.trunc(-n/e)+n),n=n<-t?n+e:-n-1}else if(n>t-1)if(t<=1)n=0;else{const e=2*t;n-=e*Math.trunc(n/e),n>=t&&(n=e-n-1)}return r.util.clamp(0,n,t-1)}(e,t);case"wrap":return function(e,t){let n=e;if(n<0)if(t<=1)n=0;else{const e=t-1;n+=t*(Math.trunc(-n/e)+1)}else if(n>t-1)if(t<=1)n=0;else{const e=t-1;n-=t*Math.trunc(n/e)}return r.util.clamp(0,n,t-1)}(e,t);case"nearest":return function(e,t){return r.util.clamp(0,e,t-1)}(e,t);default:return function(e){return e}(e)}}function kn(e,t,n,r,s,a,o,u,c,i,l){return 0<=u&&u<t&&0<=c&&c<n?e[o*r+u*s+c*a+i]:l}function mn(e,t,n,r,s,a,o,u,c,i,l){return kn(e,t,n,r,s,a,o,Math.round(u),Math.round(c),i,l)}function bn(e,t,n,r,s,a,o,u,c,i,l){const p=Math.floor(u),f=Math.floor(c),d=p+1,h=f+1;return(d-u)*((h-c)*kn(e,t,n,r,s,a,o,p,f,i,l)+(c-f)*kn(e,t,n,r,s,a,o,p,h,i,l))+(u-p)*((h-c)*kn(e,t,n,r,s,a,o,d,f,i,l)+(c-f)*kn(e,t,n,r,s,a,o,d,h,i,l))}var gn=n(85655),yn=n(2750);const xn={kernelName:r.Unique,backendName:"cpu",kernelFunc:function(e){const{inputs:t,attrs:n,backend:r}=e,{axis:s}=n,{x:a}=t;(0,un.C)(a,"unique");const o=r.data.get(a.dataId).values,{outputValues:u,outputShape:c,indices:i}=(0,yn.w)(o,s,a.shape,a.dtype);return[r.makeTensorInfo(c,a.dtype,u),r.makeTensorInfo([i.length],"int32",i)]}};const vn={kernelName:r.Unpack,backendName:"cpu",kernelFunc:function(e){const{inputs:t,backend:n,attrs:r}=e,{value:s}=t;let{axis:a}=r;a<0&&(a+=s.shape.length);const o=s.shape.length,u=s.shape[a],c=new Array(o-1);let i=0;for(let d=0;d<o;d++)d!==a&&(c[i++]=s.shape[d]);const l=new Array(o).fill(0),p=s.shape.slice();p[a]=1;const f=new Array(u);for(let d=0;d<f.length;d++){l[a]=d;const e=(0,Et.di)({inputs:{x:s},backend:n,attrs:{begin:l,size:p}});f[d]=(0,xt.t)({inputs:{x:e},backend:n,attrs:{shape:c}}),n.disposeIntermediateTensorInfo(e)}return f}};const Tn={kernelName:r.UnsortedSegmentSum,backendName:"cpu",kernelFunc:function(e){const{inputs:t,backend:n,attrs:s}=e,{x:a,segmentIds:o}=t,{numSegments:u}=s;(0,un.C)(a,"unsortedSegmentSum");const c=[],i=[],l=a.shape.length-o.shape.length;let p=o;for(let r=0;r<l;++r){const e=(0,ie.U)({inputs:{input:p},backend:n,attrs:{dim:r+1}});p=e,i.push(e)}for(let d=0;d<u;++d){const e=r.util.createScalarValue(d,"int32"),t=n.makeTensorInfo([],"int32",e),s=(0,oe.LC)({inputs:{a:t,b:p},backend:n}),o=(0,C.wg)({inputs:{x:s},backend:n,attrs:{dtype:"float32"}}),u=(0,Qe.lw)({inputs:{a:o,b:a},backend:n}),l=(0,rn.c)({inputs:{x:u},backend:n,attrs:{axis:0,keepDims:!1}});c.push(l),i.push(t),i.push(s),i.push(o),i.push(u),i.push(l)}const f=(0,ot.Z)({inputs:c,backend:n,attrs:{axis:0}});return i.forEach((e=>n.disposeIntermediateTensorInfo(e))),f}};var In=n(64064);const wn=[u,c.lO,i.t,l.D,a.UK,p.y,f.k,d.l,h.n,k.l,m.S,b.M,g.L,y.rL,x.l,v.R,T.O,I.m,w.$,o.X,M.V,F.e,N.l,S.LY,A.N,C.Ml,V.uf,z.F,L.v,W.t,D.V,j.x,E.r,$.f,q.i,K.i,U.e,Y.o,Z.k,_.O,B.T,O.$,R.Y,X.R,H.v,J.n,P.V,Q.O,G.F,ee.N,te.b,ne.b,re._,se.J,ae.x,oe.RY,ue._,ce.AC,ie.a,le.Yp,pe.N,fe.u,de.D,he.Hc,ke.Uc,me.q,be.l,ge.K,ye.a,xe.xp,ve.VM,Te.F,Ie.c,we.l,Me.K,Fe.I,Ne.I,Se.z,Ae.YW,Ce.Q,Ve.o,ze.Fx,Le.W,We.Vr,De.f,je.r,Ee.x,$e.j,qe.l,Ke.l9,Ue.$,Ye.A,Ze.S,_e.P,Be.l,Oe.M,Re.j,Xe.Nu,He.V,Je.XR,Pe.a,Qe.tJ,Ge.hd,et.m,tt.F,nt.u,rt.AL,st._,at.h,ot.q,ut.e,ct.j6,it.H,lt.S3,pt.i,ft.Y,dt.g,ht.i,kt.r,mt.GN,bt.l,gt.z,yt.X,xt.V,vt.T,Tt.j,It.j,wt.n,Mt.r,Ft.f,Nt.$,St.Lt,At.H,Ct.M,Vt.z,zt.k,Lt.X3,Wt.C,Dt.b,jt.$,Et.lv,$t.$,qt.Z,Kt.W,Ut.K,Yt.F,Zt.v,_t.j,Bt.x,Ot.t,Rt.Fu,Xt.e,Ht.b2,Jt.C,Pt.t,Qt.c,Gt.Q,en.o,tn.J,nn.Zl,rn.q,sn.W,an.i,on.B,ln,fn,dn,gn.W,xn,vn,Tn,In.Z];for(const Mn of wn)(0,r.registerKernel)(Mn)},53475:function(e,t,n){n.d(t,{x:function(){return o}});var r=n(9495);const s=(e,t)=>{const n=t.value-e.value;return 0===n?e.index-t.index:n};function a(e,t,n=0,o=e.length-1){for(;o>n;){if(o-n>600){const r=o-n+1,s=t-n+1,u=Math.log(r),c=.5*Math.exp(2*u/3),i=.5*Math.sqrt(u*c*(r-c)/r)*Math.sign(s-r/2);a(e,t,Math.max(n,Math.floor(t-s*c/r+i)),Math.min(o,Math.floor(t+(r-s)*c/r+i)))}const u=e[t];let c=n,i=o;for(r.util.swap(e,n,t),s(e[o],u)>0&&r.util.swap(e,n,o);c<i;){for(r.util.swap(e,c,i),c++,i--;s(e[c],u)<0;)c+=1;for(;s(e[i],u)>0;)i-=1}0===s(e[n],u)?r.util.swap(e,n,i):(i+=1,r.util.swap(e,i,o)),i<=t&&(n=i+1),t<=i&&(o=i-1)}}function o(e,t,n,o,u){const c=t[t.length-1],[i,l]=[e.length/c,c],p=r.util.getTypedArrayFromDType(n,i*o),f=r.util.getTypedArrayFromDType("int32",i*o);for(let r=0;r<i;r++){const t=r*l,n=e.subarray(t,t+l);let c=new Array(n.length);n.forEach(((e,t)=>c[t]={value:e,index:t})),o<c.length&&(a(c,o),c=c.slice(0,o)),u&&c.sort(s);const i=r*o,d=p.subarray(i,i+o),h=f.subarray(i,i+o);for(let e=0;e<o;e++)d[e]=c[e].value,h[e]=c[e].index}const d=t.slice();return d[d.length-1]=o,[(0,r.buffer)(d,n,p),(0,r.buffer)(d,"int32",f)]}},64064:function(e,t,n){n.d(t,{P:function(){return c},Z:function(){return i}});var r=n(9495),s=n(89436),a=n(80015),o=n(18944),u=n(85806);function c(e){const{inputs:t,backend:n}=e,{x:r}=t;if("string"===r.dtype)throw new Error("zerosLike is not supported for string tensors");if("complex64"===r.dtype){const e=(0,u.x)({inputs:{input:r},backend:n}),t=c({inputs:{x:e},backend:n}),a=(0,o.n)({inputs:{input:r},backend:n}),i=c({inputs:{x:a},backend:n}),l=(0,s.f)({inputs:{real:t,imag:i},backend:n});return n.disposeIntermediateTensorInfo(e),n.disposeIntermediateTensorInfo(t),n.disposeIntermediateTensorInfo(a),n.disposeIntermediateTensorInfo(i),l}return(0,a.G)({backend:n,attrs:{shape:r.shape,value:0,dtype:r.dtype}})}const i={kernelName:r.ZerosLike,backendName:"cpu",kernelFunc:c}},85655:function(e,t,n){n.d(t,{W:function(){return u},m:function(){return o}});var r=n(9495),s=n(97870),a=n(13396);function o(e){const{inputs:t,attrs:n,backend:r}=e,{x:o}=t,{perm:u}=n;(0,s.C)(o,"transpose");const c=o.shape.length,i=new Array(c);for(let s=0;s<i.length;s++)i[s]=o.shape[u[s]];const l=r.data.get(o.dataId).values,p=(0,a._)(l,o.shape,o.dtype,u,i);return{dataId:r.write(p,i,o.dtype),shape:i,dtype:o.dtype}}const u={kernelName:r.Transpose,backendName:"cpu",kernelFunc:o}}}]);
//# sourceMappingURL=stylist-vendors-8cb190b9.89e9f9dea663ab2f7951.js.map