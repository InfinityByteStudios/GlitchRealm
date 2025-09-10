// Firestore + helpers: load only where needed (reviews, notifications, submissions)
import './firebase-core.js';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const db = getFirestore();
window.firebaseFirestore = db;
window.firestoreCollection = collection;
window.firestoreAddDoc = addDoc;
window.firestoreQuery = query;
window.firestoreWhere = where;
window.firestoreOrderBy = orderBy;
window.firestoreLimit = limit;
window.firestoreGetDocs = getDocs;
