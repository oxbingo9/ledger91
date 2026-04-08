import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('searchBtn').addEventListener('click', async () => {
    const year = document.getElementById('yearInput').value;
    const resultDiv = document.getElementById('result');
    
    resultDiv.innerText = "조회 중...";

    try {
        const docRef = doc(db, "insa", year);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            resultDiv.innerText = `${year}년 회장: ${docSnap.data().chairman}`;
        } else {
            resultDiv.innerText = "데이터가 없습니다.";
        }
    } catch (e) {
        resultDiv.innerText = "오류 발생: " + e.message;
    }
});
