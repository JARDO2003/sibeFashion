/**
 * SIBE STYLE — Configuration Firebase & Cloudinary
 * -----------------------------------------------------------------------
 * Utilise les SDK Firebase "compat" (chargés en <script> dans le HTML)
 * pour rester en JS simple, sans étape de build.
 */

const firebaseConfig = {
  apiKey: "AIzaSyDzM2TwtHqQx68XdjkrsClOq7LnORq9Q24",
  authDomain: "docteursibe.firebaseapp.com",
  databaseURL: "https://docteursibe-default-rtdb.firebaseio.com",
  projectId: "docteursibe",
  storageBucket: "docteursibe.firebasestorage.app",
  messagingSenderId: "663812927704",
  appId: "1:663812927704:web:424358a8b44cf2d6e327ad",
  measurementId: "G-KWYGTTBFKY",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

window.db = db;
window.auth = auth;

// --- Cloudinary (upload non-signé) ---------------------------------------
const cloudinaryConfig = { cloudName: "djxcqczh1", uploadPreset: "database" };
window.cloudinaryConfig = cloudinaryConfig;

/**
 * Upload un fichier image vers Cloudinary et renvoie l'URL sécurisée.
 * @param {File} file
 * @param {(percent:number)=>void} onProgress
 * @returns {Promise<string>}
 */
async function uploadImageToCloudinary(file, onProgress) {
  const url = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", cloudinaryConfig.uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.secure_url) resolve(res.secure_url);
        else reject(new Error(res.error?.message || "Échec de l'upload Cloudinary"));
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l'upload Cloudinary"));
    xhr.send(formData);
  });
}

window.uploadImageToCloudinary = uploadImageToCloudinary;

/**
 * Collections Firestore utilisées par le site :
 *  - "produits"   : { nom, prix, prixPromo, categorie, image, description, stock, enPromo, dateAjout }
 *  - "commandes"  : { type: "directe"|"personnalisee", produitId?, nom, telephone, adresse,
 *                     specifications, statut, montant, dateCreation }
 *  - "proverbes"  : { texte } — proverbes additionnels ajoutés par le fournisseur
 *  - "categories" : { nom, image }
 */