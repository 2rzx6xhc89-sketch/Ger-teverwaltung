/* Lokale Datenhaltung (IndexedDB) mit derselben Schnittstelle wie ein Dokumentenspeicher:
   db.collection(name).doc(id?) / db.doc('sammlung/id') mit get, set, update, delete, onSnapshot.
   Alle Daten bleiben im Browser dieses Geräts. Abgleich zwischen Geräten: Sicherung exportieren/importieren. */
(function(){
  'use strict';
  const DB_NAME='galabau-geraete',STORE='docs';
  const mem=new Map(),listeners=[];
  let idb=null,ready=null,bc=null;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);

  function openIdb(){
    return new Promise((res,rej)=>{
      if(!window.indexedDB){rej(new Error('Dieser Browser unterstützt keine lokale Datenbank.'));return;}
      const rq=indexedDB.open(DB_NAME,1);
      rq.onupgradeneeded=()=>{rq.result.createObjectStore(STORE);};
      rq.onsuccess=()=>res(rq.result);
      rq.onerror=()=>rej(rq.error||new Error('Lokale Datenbank konnte nicht geöffnet werden.'));
    });
  }
  function init(){
    if(ready)return ready;
    ready=openIdb().then(db=>new Promise((res,rej)=>{
      idb=db;
      const tx=db.transaction(STORE,'readonly'),st=tx.objectStore(STORE),rq=st.openCursor();
      rq.onsuccess=()=>{const c=rq.result;if(c){mem.set(c.key,c.value);c.continue();}};
      tx.oncomplete=()=>res();
      tx.onerror=()=>rej(tx.error);
    })).then(()=>{
      try{
        bc=new BroadcastChannel('galabau-geraete');
        bc.onmessage=e=>{const m=e.data;if(!m||!m.path)return;if(m.op==='del')mem.delete(m.path);else mem.set(m.path,m.data);notify(m.path);};
      }catch(_){}
      try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(_){}
    });
    return ready;
  }
  function persist(path,data,del){
    return new Promise((res,rej)=>{
      const tx=idb.transaction(STORE,'readwrite'),st=tx.objectStore(STORE);
      if(del)st.delete(path);else st.put(data,path);
      tx.oncomplete=()=>res();
      tx.onerror=()=>rej(tx.error||new Error('Speichern fehlgeschlagen (Speicher voll?).'));
      tx.onabort=()=>rej(tx.error||new Error('Speichern fehlgeschlagen (Speicher voll?).'));
    });
  }
  const idOf=p=>p.split('/').pop();
  function snapDoc(path){
    const has=mem.has(path),v=has?mem.get(path):undefined;
    return{id:idOf(path),exists:has,data:()=>has?clone(v):undefined};
  }
  function snapCol(name){
    const docs=[];
    mem.forEach((v,k)=>{const p=k.split('/');if(p.length===2&&p[0]===name)docs.push({id:p[1],exists:true,data:()=>clone(v)});});
    return{docs:docs,size:docs.length,empty:!docs.length};
  }
  function notify(path){
    const col=path.split('/')[0];
    listeners.slice().forEach(l=>{
      try{
        if(l.type==='col'&&l.name===col)l.fn(snapCol(col));
        else if(l.type==='doc'&&l.path===path)l.fn(snapDoc(path));
      }catch(e){console.error(e);}
    });
  }
  async function write(path,data,del){
    await init();
    const had=mem.get(path);
    if(del)mem.delete(path);else mem.set(path,data);
    try{await persist(path,data,del);}
    catch(e){if(had===undefined)mem.delete(path);else mem.set(path,had);notify(path);throw e;}
    notify(path);
    try{if(bc)bc.postMessage({op:del?'del':'set',path:path,data:del?null:data});}catch(_){}
  }
  function docRef(path){
    return{
      id:idOf(path),path:path,
      get:async()=>{await init();return snapDoc(path);},
      set:d=>write(path,clone(d),false),
      update:async f=>{await init();if(!mem.has(path))throw new Error('Eintrag nicht gefunden.');await write(path,Object.assign(clone(mem.get(path)),clone(f)),false);},
      delete:()=>write(path,null,true),
      onSnapshot:(fn,err)=>{
        const l={type:'doc',path:path,fn:fn};
        init().then(()=>{listeners.push(l);fn(snapDoc(path));}).catch(e=>{if(err)err(e);});
        return()=>{const i=listeners.indexOf(l);if(i>=0)listeners.splice(i,1);};
      }
    };
  }
  function colRef(name){
    return{
      doc:id=>docRef(name+'/'+(id||rid())),
      onSnapshot:(fn,err)=>{
        const l={type:'col',name:name,fn:fn};
        init().then(()=>{listeners.push(l);fn(snapCol(name));}).catch(e=>{if(err)err(e);});
        return()=>{const i=listeners.indexOf(l);if(i>=0)listeners.splice(i,1);};
      }
    };
  }
  window.LocalDB={
    init:init,
    doc:docRef,
    collection:colRef,
    exportAll:async()=>{await init();const docs={};mem.forEach((v,k)=>{docs[k]=v;});return{format:'galabau-geraete',version:1,exportiert:new Date().toISOString(),docs:docs};},
    importAll:async(obj,replace)=>{
      await init();
      if(!obj||obj.format!=='galabau-geraete'||!obj.docs||typeof obj.docs!=='object')throw new Error('Das ist keine gültige Sicherungsdatei dieser App.');
      const keys=Object.keys(obj.docs).filter(k=>/^[a-z]+\/[^\/]+$/.test(k));
      if(replace){for(const k of Array.from(mem.keys()))await write(k,null,true);}
      for(const k of keys)await write(k,obj.docs[k],false);
      return keys.length;
    },
    setMany:async docs=>{await init();for(const k of Object.keys(docs))await write(k,clone(docs[k]),false);}
  };
})();
