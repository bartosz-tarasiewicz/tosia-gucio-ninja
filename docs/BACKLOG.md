# Product backlog — Tosia & Gucio Ninja Adventure

## Potwierdzone wymagania

- Windows / komputer, gra uruchamiana w przeglądarce. Telefony **poza pierwszą wersją**.
- Dwie osoby jednocześnie na jednym komputerze i klawiaturze.
- Grafika 3D w stylistyce plastikowych figurek/klocków, inspirowanej grami LEGO.
- Przygoda z eksploracją mapy, rozwidleniami, sekretami i zagadkami.
- Kooperacja jest obowiązkowa, nie tylko opcjonalna.
- Klimat: poważna misja z elementami humoru; bez krwi i zbędnej przemocy.
- Docelowo sześciu ninja do wyboru na starcie; ich charakterystyczne bronie, możliwość zmiany broni.
- Zbieranie monet i możliwość wykonania przynajmniej jednego ulepszenia broni w pierwszej pełniejszej wersji.
- Zakres produkcyjny: **pierwsza mała przygoda / jeden etap**, możliwość rozbudowy później.

## Milestone P0 — uruchamialny prototyp technologiczny (pliki w tym repo)

- [x] Vite + TypeScript + Babylon.js (kod źródłowy i konfiguracja)
- [x] Dwie sterowalne postacie z jednej klawiatury
- [x] Uproszczone ruch, skok i kamera
- [x] Prosta scena 3D i jedna zagadka kooperacyjna (dwie płyty)
- [x] Brama, portal, monety i ekran zwycięstwa
- [ ] Potwierdzenie `npm install` oraz `npm run build` na komputerze użytkownika
- [ ] Test klawiatury przez Tosię i Gucia oraz poprawki ergonomii

## Milestone P1 — pierwsza mała kompletna gra (do zrobienia po P0)

- [ ] Ekran wyboru jednej z sześciu postaci dla każdego gracza
- [ ] Modele i animacje sześciu ninja, rozróżnialni bohaterowie
- [ ] Broń postaci, przełączanie broni i proste mechaniki walki bez krwi
- [ ] Monety z funkcją zakupową: co najmniej jedno ulepszenie broni
- [ ] Zagadki o dwóch różnych mechanizmach i ukryty sekret
- [ ] Prosta historia, zabawne dialogi, początek i zakończenie misji
- [ ] Efekty dźwiękowe i zapis postępu
- [ ] Wstępna optymalizacja oraz testy na docelowym komputerze

## Później — poza zakresem pierwszej gry

- [ ] Dodatkowe plansze / bossowie / moce Spinjitzu i smoka
- [ ] Odblokowywanie nowych grywalnych postaci po misjach
- [ ] Uruchamianie na telefonie, dotyk
- [ ] Sieciowa kooperacja na dwóch urządzeniach

## Workflow

W każdym zadaniu: opis historii użytkownika i kryteriów akceptacji → issue → branch → implementacja → lokalne testy → PR → merge. Dzieci testują przede wszystkim grywalność, dorośli i automatyczna CI weryfikują technikalia.
