"use client";
import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBi82idZAraoDMEMVBhVv66tURB0lSI0UM",
  authDomain: "ledger91-e95ea.firebaseapp.com",
  databaseURL: "https://ledger91-e95ea-default-rtdb.firebaseio.com",
  projectId: "ledger91-e95ea",
  storageBucket: "ledger91-e95ea.firebasestorage.app",
  messagingSenderId: "747494068723",
  appId: "1:747494068723:web:67fe836743fb16f89f8286",
  measurementId: "G-LWQ95J4B1B"
};




const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export default function Home() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const snapshot = await getDocs(collection(db, "insa"));
        const rows = snapshot.docs.map(doc => doc.data());
        setData(rows);
      } catch (err) {
        setError("오류: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <p>불러오는 중...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>INSA 데이터</h1>
      {data.map((row, i) => (
        <div key={i} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
          <p>YEAR: {row.YEAR}</p>
          <p>CHAIRMAN: {row.CHAIRMAN}</p>
          <p>SECRETARY: {row.SECRETARY}</p>
          <p>CARRYOVER: {row.CARRYOVER}</p>
        </div>
      ))}
    </div>
  );
}
