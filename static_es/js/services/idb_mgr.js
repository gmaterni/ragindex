import Dexie from './vendor/dexie.js';

/**
 * idbMgr - Gestore IndexedDB basato su Dexie.js
 * Mantiene la stessa interfaccia dell'originale basato su idb-keyval
 * ma offre prestazioni superiori e una base per query complesse.
 */

// Inizializzazione del database Dexie
const db = new Dexie("RagIndexDB");

// AAA Dexie - Definizione dello schema
// kvStore: tabella originale per dati pesanti
// settings: nuova tabella per configurazioni (ex localStorage)
db.version(2).stores({
  kvStore: 'id',
  settings: 'id' 
});

export const idbMgr = {
  
  /**
   * Accesso diretto al database Dexie per utilizzi avanzati
   */
  db() {
    return db;
  },

  /**
   * Crea o aggiorna un record
   */
  async create(key, value) {
    try {
      await db.kvStore.put({ id: key, value: value });
      return true;
    } catch (error) {
      console.error('Dexie: Errore durante la creazione:', error);
      return false;
    }
  },

  /**
   * Legge un record
   */
  async read(key) {
    try {
      const record = await db.kvStore.get(key);
      return record ? record.value : undefined;
    } catch (error) {
      console.error('Dexie: Errore durante la lettura:', error);
      return undefined;
    }
  },

  /**
   * Aggiorna un record esistente (alias di create)
   */
  async update(key, value) {
    return await this.create(key, value);
  },

  /**
   * Elimina un record
   */
  async delete(key) {
    try {
      await db.kvStore.delete(key);
      return true;
    } catch (error) {
      console.error('Dexie: Errore durante l\'eliminazione:', error);
      return false;
    }
  },

  /**
   * Verifica se una chiave esiste
   */
  async exists(key) {
    try {
      const count = await db.kvStore.where('id').equals(key).count();
      return count > 0;
    } catch (error) {
      console.error('Dexie: Errore durante la verifica esistenza:', error);
      return false;
    }
  },

  /**
   * Ottiene tutte le chiavi
   */
  async getAllKeys() {
    try {
      return await db.kvStore.toCollection().primaryKeys();
    } catch (error) {
      console.error('Dexie: Errore durante il recupero delle chiavi:', error);
      return [];
    }
  },

  /**
   * Ottiene le chiavi che iniziano con un prefisso
   * Ottimizzato rispetto al filtraggio manuale in memoria
   */
  async selectKeys(prefix) {
    try {
      return await db.kvStore
        .where('id')
        .startsWith(prefix)
        .primaryKeys();
    } catch (error) {
      console.error('Dexie: Errore durante selectKeys:', error);
      return [];
    }
  },

  /**
   * Ottiene tutti i record come array di oggetti {key, value}
   */
  async getAllRecords() {
    try {
      const all = await db.kvStore.toArray();
      return all.map(r => ({ key: r.id, value: r.value }));
    } catch (error) {
      console.error('Dexie: Errore durante getAllRecords:', error);
      return [];
    }
  },

  /**
   * Ottiene i record con prefisso (Ottimizzato con Dexie)
   */
  async selectRecords(prefix) {
    try {
      const records = await db.kvStore
        .where('id')
        .startsWith(prefix)
        .toArray();
      return records.map(r => ({ key: r.id, value: r.value }));
    } catch (error) {
      console.error(`Dexie: Errore durante selectRecords con prefisso '${prefix}':`, error);
      return [];
    }
  },

  /**
   * Pulisce COMPLETAMENTE e INDISCRIMINATAMENTE tutto il database IndexedDB
   */
  async clearAll() {
    try {
      // AAA Dexie - Cicla su tutte le tabelle esistenti e le svuota
      const tables = db.tables;
      await Promise.all(tables.map(table => table.clear()));
      return true;
    } catch (error) {
      console.error('Dexie: Errore durante la pulizia totale del database:', error);
      return false;
    }
  }
};