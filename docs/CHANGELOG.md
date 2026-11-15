# Changelog

## 0.5.0 — Painted Visual Rebuild (art pack)
- Nowy zestaw ręcznie stylizowanych, ilustracyjnych materiałów WebP: tło fantasy, Tosia i Gucio, roślinne platformy i kamieniste podłoże.
- Loader wybiera ilustracje z public/art/v05, gdy są dostępne, zachowując fallback graficzny v0.4.
- Poprawiony interfejs HUD; gra nadal korzysta z Phaser 3 i dotychczasowych mechanik.
- Asset pack jest binarny i musi zostać dołączony osobno do gałęzi PR przed scaleniem; nie scalać bez assetów.
- Obowiązuje odbiór wizualny w przeglądarce przez Tosię i Gucia przed wypuszczeniem na main.

## 0.4.0 — Illustrated Ninja Platformer (nowy kierunek)
- Nowa gra Phaser 3 2D w tym samym repo. Widok z boku, osobne grafiki SVG ninja i malownicze warstwowe tło świątyni.
- Sterowanie dla dwóch dzieci na jednej klawiaturze, skoki i shurikeny.
- 9 monet, 2 cele treningowe, 2 płyty odblokowujące most i wspólny portal.
- Poprzednia implementacja 3D zostaje w repo jako archiwalne pliki src/game; nowa gra startuje przez src/main.ts.
- Pierwszy prototyp wizualny: wymaga testu w przeglądarce i oceny stylu przez dzieci. Grafiki są autorskimi ilustracjami, nie oficjalnymi zasobami LEGO/Ninjago.

## 0.3.1 – Figurki w stylu LEGO (eksperymentalnie)
- Szerszy, zwężany tułów i zaokrąglone ramiona oraz dłonie z otwartym uchwytem C.
- Detale stroju, opaska i nakrycie głowy, kolorowe oznaczenia postaci.
- Kamera bliżej akcji, wyraźniejsze światło.
- Brak zmian mechaniki, sterowania i zagadek.
- Test wizualny w przeglądarce wymagany; projekt nie wykorzystuje oficjalnych modeli LEGO.

## 0.3.0 – Ninja Visuals
- Nowe modele ninja: maski, opaski, pasy, pochwy mieczy i ruchome kończyny.
- Animacje biegu, bezczynności, skoku i rzutu shurikenem.
- Kolorowe dekoracje świątyni: chorągwie, latarnie, dach bramy, bambusy i kamienie.
- Sterowanie, tarcze treningowe, monety, brama i portal pozostają bez zmian.
- Cała grafika jest proceduralna; to autorskie figurki inspirowane zabawkami, bez oficjalnych zasobów LEGO.

## 0.2.0 – Shuriken Training
- Tosia: Q, Gucio: prawy Shift – rzut shurikenem.
- Dwa cele treningowe (po bokach przed bramą). Podejdź na około 4 jednostki od tarczy i naciśnij atak.
- Shuriken przelatuje do celu, cel zmienia kolor na zielony.
- Licznik trafień 0/2 w prawym górnym rogu.
- Dotychczasowa zagadka z płytami, zbieranie monet i portal pozostają bez zmian.
- Cele treningowe są opcjonalne; nie blokują zakończenia poziomu.
