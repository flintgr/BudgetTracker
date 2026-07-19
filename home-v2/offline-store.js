/* BudgetTracker v1.1.0 — Offline storage (IndexedDB) */
(function(){
  const DB_NAME = "budgetTrackerOfflineV1";
  const DB_VERSION = 1;
  const STORES = { cache:"cache", queue:"queue" };

  function openDb(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORES.cache)) db.createObjectStore(STORES.cache,{keyPath:"key"});
        if(!db.objectStoreNames.contains(STORES.queue)){
          const store=db.createObjectStore(STORES.queue,{keyPath:"clientTransactionId"});
          store.createIndex("createdAt","createdAt",{unique:false});
          store.createIndex("status","status",{unique:false});
        }
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error || new Error("IndexedDB could not open"));
    });
  }

  async function withStore(name,mode,work){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(name,mode);
      const store=tx.objectStore(name);
      let result;
      try{ result=work(store); }catch(error){ db.close(); reject(error); return; }
      tx.oncomplete=()=>{ db.close(); resolve(result); };
      tx.onerror=()=>{ db.close(); reject(tx.error || new Error("IndexedDB transaction failed")); };
      tx.onabort=()=>{ db.close(); reject(tx.error || new Error("IndexedDB transaction aborted")); };
    });
  }

  function requestResult(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }

  const api={
    async setCache(key,value){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORES.cache,"readwrite");
        tx.objectStore(STORES.cache).put({key,value,updatedAt:new Date().toISOString()});
        tx.oncomplete=()=>{db.close();resolve(value)};
        tx.onerror=()=>{db.close();reject(tx.error)};
      });
    },
    async getCache(key){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORES.cache,"readonly");
        const req=tx.objectStore(STORES.cache).get(key);
        req.onsuccess=()=>resolve(req.result || null);
        req.onerror=()=>reject(req.error);
        tx.oncomplete=()=>db.close();
      });
    },
    async enqueue(item){
      const record={...item,status:"pending",attempts:Number(item.attempts||0),createdAt:item.createdAt||new Date().toISOString(),lastError:""};
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORES.queue,"readwrite");
        tx.objectStore(STORES.queue).put(record);
        tx.oncomplete=()=>{db.close();resolve(record)};
        tx.onerror=()=>{db.close();reject(tx.error)};
      });
    },
    async listQueue(){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORES.queue,"readonly");
        const req=tx.objectStore(STORES.queue).getAll();
        req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))));
        req.onerror=()=>reject(req.error);
        tx.oncomplete=()=>db.close();
      });
    },
    async removeQueue(id){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORES.queue,"readwrite");
        tx.objectStore(STORES.queue).delete(id);
        tx.oncomplete=()=>{db.close();resolve()};
        tx.onerror=()=>{db.close();reject(tx.error)};
      });
    },
    async markFailed(id,error){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction(STORES.queue,"readwrite");
        const store=tx.objectStore(STORES.queue);
        const req=store.get(id);
        req.onsuccess=()=>{
          const item=req.result;
          if(item){ item.attempts=Number(item.attempts||0)+1; item.lastError=String(error||"Sync failed"); item.status="pending"; store.put(item); }
        };
        tx.oncomplete=()=>{db.close();resolve()};
        tx.onerror=()=>{db.close();reject(tx.error)};
      });
    },
    async clearAll(){
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction([STORES.cache,STORES.queue],"readwrite");
        tx.objectStore(STORES.cache).clear();
        tx.objectStore(STORES.queue).clear();
        tx.oncomplete=()=>{db.close();resolve()};
        tx.onerror=()=>{db.close();reject(tx.error)};
      });
    }
  };
  window.BudgetOfflineStore=api;
})();
