# Test plan — pierwszy prototyp

Test ręczny: otwórz dwa okna? **Nie** — używaj jednego okna i dwóch graczy na jednej klawiaturze.

| ID | Krok | Oczekiwany rezultat |
|---|---|---|
| T01 | `npm install`, `npm run dev`; otwórz lokalny adres | Scena 2D, dwie postacie i HUD widoczne bez błędów |
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

## v0.5.6 — walka Nya/Lloyd i animacja

| ID | Krok | Oczekiwany rezultat |
|---|---|---|
| T11 | Tosia naciska Q stojąc blisko tarczy dojo | Widoczny łuk cięcia miecza; tarcza zostaje zaliczona tylko w zasięgu i przed postacią |
| T12 | Gucio naciska Shift, stojąc blisko tarczy dojo | Dwa miecze wykonują zamach, a trafienie zalicza się tylko z bliska |
| T13 | Q oraz Shift w tym samym czasie | Oboje mogą atakować niezależnie; nie blokują sobie sterowania |
| T14 | Idź i skacz postaciami, obserwując obie sylwetki | Kończyny zmieniają położenie, animacja nie wpływa na kolizje ani pozycję stóp |
| T15 | Rozdziel postacie do granicy wspólnego ekranu | Postać oddalająca się jest zatrzymywana, druga nie jest przeciągana |
| T16 | Zagraj do końca i uruchom ponownie | Most, pieczęcie, kamera i portal nadal działają |
| T17 | Porównaj postacie | Tosia ma katanę; Gucio dwa miecze i odmienny atak; grafika i broń nie mają widocznych prostokątnych obwódek |

**Do odbioru wizualnego:** Nowe projekty pełnych postaci inspirowane minifigurkami ninja są opracowane oddzielnie; nie uznawać ich za zintegrowane z grą, dopóki nie trafią do zasobów gry i nie przejdą playtestu.

| T18 | Tosia naciska E, gdy tarcza jest przed nią do 410 px | Wodna fala leci do tarczy i aktywuje ją po uderzeniu |
| T19 | Gucio naciska Ctrl, gdy tarcza jest przed nim do 560 px | Zielona energia leci do tarczy i aktywuje ją po uderzeniu |
| T20 | Ataki żywiołów przy prawym i lewym kierunku postaci | Pociski lecą w odpowiednim kierunku, bez atakowania celów z tyłu |
| T21 | Wciśnij ataki dwóch ninja w tym samym momencie | Efekty i trafienia są niezależne |
