# Test plan — pierwszy prototyp

Test ręczny: otwórz dwa okna? **Nie** — używaj jednego okna i dwóch graczy na jednej klawiaturze.

| ID | Krok | Oczekiwany rezultat |
|---|---|---|
| T01 | `npm install`, `npm run dev`; otwórz lokalny adres | Scena 3D, dwie postacie i HUD widoczne bez błędów |
| T02 | Tosia używa WASD, Gucio strzałek | Każda postać porusza się niezależnie, również równocześnie |
| T03 | Wciśnij Spację i Enter | Obie postacie mogą skoczyć |
| T04 | Spróbuj przejść przez zamkniętą bramę | Postać nie przechodzi przed aktywacją płyt |
| T05 | Ustaw jedną postać na lewej płycie, drugą na prawej | Brama się otwiera i pozostaje otwarta |
| T06 | Zbierz monetę jedną z postaci | Licznik rośnie o 1, moneta znika |
| T07 | Przeprowadź oboje przez most do portalu | Pojawia się ekran zwycięstwa |
| T08 | Kliknij „Zagraj ponownie” | Gra resetuje się do stanu początkowego |
| T09 | Otwórz DevTools (F12), zakładka Console | Brak nieobsłużonych błędów JavaScript |
| T10 | `npm run check`, `npm run build` | TypeScript i Vite kończą działanie bez błędów |

**Uwaga:** przy niektórych klawiaturach klawisze mogą blokować się przy wielokrotnym jednoczesnym użyciu. To problem sprzętowego ghostingu, niekoniecznie gry. W razie problemów zmienimy układ klawiszy albo dodamy obsługę kontrolerów.
