# Tosia & Gucio v2 — decyzja architektoniczna i próg jakości

Status: **projekt prototypowy, bez decyzji o migracji produkcyjnej**. Zadanie: https://github.com/bartosz-tarasiewicz/tosia-gucio-ninja/issues/6

## Kontekst techniczny
Aktualna gra uruchamia Phaser 3.90 z `src/main.ts` (TypeScript/Vite/Arcade Physics). Kod Babylon.js w `src/game/` nie jest ścieżką uruchomieniową obecnej strony. Główną porażką wersji 0.5.x jest pipeline ilustracji i animacji: próba uzyskania naturalnego ruchu z pojedynczych obrazów, błędne zaczepy dłoni i broni oraz zbyt uproszczone VFX walki.

## Porównanie do przetestowania
| Kryterium | Phaser 3.90 | Godot 4 |
|---|---|---|
| Wykorzystanie dotychczasowego kodu | + | - |
| Natywny edytor scen, animacji i rigów 2D | wymaga zewnętrznych narzędzi / integracji | + |
| Budowanie samodzielnej gry Windows | dodatkowa otoczka aplikacji | natywny eksport |
| Współdzielony ekran, fizyka, walka, efekty 2D | obsługuje | obsługuje |
| Koszt przejścia | niski przy pozostaniu | wyższy, nowa implementacja |

**Wstępny wybór do spike:** Godot 4 + GDScript; nie jest to potwierdzenie, że silnik sam poprawi jakość grafiki.

## Gate 1 — demonstrator jednego bohatera
Przed kodowaniem całego levelu przygotować małe porównanie na tych samych docelowych assetach. Wymagane: wyraźny bieg z naprzemienną pracą kończyn, odbicie/lądowanie, pełny zamach i powrót, rękojeść dokładnie w dłoni w każdej pozie, spójny kierunek/odbicie. Zrzut/nagranie gry, nie tylko kompilacja. **Brak aprobaty wizualnej = stop, poprawa art pipeline, bez dodawania poziomów.**

## Gate 2 — demonstrator dwóch postaci
Tosia: katana + moc wody. Gucio: dwa miecze + zielona energia. Odmienne ruchy i sylwetki, osobne hitboxy, zakotwiczone wystrzeliwanie mocy. Dwie osoby na jednej klawiaturze. Shift wykluczony z ataku. Kamera nigdy nie przeciąga nieruchomego gracza.

## Gate 3 — vertical slice
Jedna krótka, grywalna plansza, zadanie kooperacyjne, łagodni przeciwnicy, dojście do celu, brak krwi. Samodzielny build Windows x86_64, test manualny dwóch graczy, akceptacja przed dalszym zakresem.

## Gate 4 — dopiero po jakości
Trzy plansze do wyboru, różnorodne bronie i umiejętności, ulepszanie ekwipunku po zwycięstwie, postęp i balans.

## Nienegocjowalne zasady
- Oryginalne postacie ninja z czytelną tożsamością, stylistyka przygodowa, bez kopiowania wyglądu konkretnych bohaterów cudzego IP.
- Nie scalać PR #5 ani nie niszczyć poprzedniej wersji.
- Zatrzymać zakres, jeśli jakość ruchu/walki nie spełnia oczekiwań, zamiast mnożyć efekty i nowe plansze.
- Raportować osobno: kod napisany, kompilacja przechodzi, test w edytorze, test wizualny, test z dziećmi.
