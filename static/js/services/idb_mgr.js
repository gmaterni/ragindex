
import { get, set, del, clear, keys } from './vendor/idb-keyval.js';
// import { get, set, del, clear, keys } from 'https://unpkg.com/idb-keyval@6/dist/index.js';

/**
 * idbMgr - Wrapper semplice per gestire IndexedDB tramite idb-keyval
 * Fornisce metodi CRUD e gestione delle chiavi
 */
export const idbMgr = {

  /**
   * Crea o aggiorna un record nel database
   * @param {string} key - Chiave del record
   * @param {*} value - Valore da salvare (può essere qualsiasi tipo serializzabile)
   * @returns {Promise<boolean>} - true se l'operazione è riuscita
   */
  async create(key, value) {
    try {
      await set(key, value);
      return true;
    } catch (error) {
      console.error('Errore durante la creazione:', error);
      return false;
    }
  },

  /**
   * Legge un record dal database
   * @param {string} key - Chiave del record da leggere
   * @returns {Promise<*>} - Il valore associato alla chiave, undefined se non trovato
   */
  async read(key) {
    try {
      return await get(key);
    } catch (error) {
      console.error('Errore durante la lettura:', error);
      return undefined;
    }
  },

  /**
   * Aggiorna un record esistente (alias di create)
   * @param {string} key - Chiave del record
   * @param {*} value - Nuovo valore
   * @returns {Promise<boolean>} - true se l'operazione è riuscita
   */
  async update(key, value) {
    return await this.create(key, value);
  },

  /**
   * Elimina un record dal database
   * @param {string} key - Chiave del record da eliminare
   * @returns {Promise<boolean>} - true se l'operazione è riuscita
   */
  async delete(key) {
    try {
      await del(key);
      return true;
    } catch (error) {
      console.error('Errore durante l\'eliminazione:', error);
      return false;
    }
  },

  /**
   * Verifica se una chiave esiste nel database
   * @param {string} key - Chiave da verificare
   * @returns {Promise<boolean>} - true se la chiave esiste
   */
  async exists(key) {
    try {
      const value = await get(key);
      return value !== undefined;
    } catch (error) {
      console.error('Errore durante la verifica esistenza:', error);
      return false;
    }
  },

  /**
   * Ottiene tutte le chiavi presenti nel database
   * @returns {Promise<Array<string>>} - Array delle chiavi, array vuoto in caso di errore
   */
  async getAllKeys() {
    try {
      return await keys();
    } catch (error) {
      console.error('Errore durante il recupero delle chiavi:', error);
      return [];
    }
  },
  async selectKeys(pre) {
    try {
      const allKeys = await keys();
      return allKeys.filter(chiave => chiave.startsWith(pre));
    } catch (error) {
      console.error('Errore durante il recupero delle chiavi:', error);
      return [];
    }
  },


  /**
   * Ottiene tutti i record come array di oggetti {key, value}
   * @returns {Promise<Array<{key: string, value: *}>>} - Array di oggetti record
   */
  async getAllRecords() {
    try {
      const allKeys = await keys();
      const records = [];

      for (const key of allKeys) {
        const value = await get(key);
        records.push({ key, value });
      }

      return records;
    } catch (error) {
      console.error('Errore durante il recupero di tutti i record:', error);
      return [];
    }
  },
  async selectRecords(prefix) {
    try {
      const allKeys = await keys();
      const records = [];
      for (const key of allKeys) {
        if (key.startsWith(prefix)) {
          const value = await get(key);
          records.push({ key, value });
        }
      }
      return records;
    } catch (error) {
      console.error(`Errore durante il recupero dei record con prefisso '${prefix}':`, error);
      return [];
    }
  },
  /**
   * Pulisce completamente il database
   * @returns {Promise<boolean>} - true se l'operazione è riuscita
   */
  async clearAll() {
    try {
      await clear();
      return true;
    } catch (error) {
      console.error('Errore durante la pulizia del database:', error);
      return false;
    }
  }


};

// export default idbMgr;