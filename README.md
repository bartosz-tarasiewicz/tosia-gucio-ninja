# Tosia & Gucio — Ninja Adventure 🥷

**Projekt 01: Świątynia Dwóch Żywiołów.** Prototyp kooperacyjnej gry 3D uruchamianej w przeglądarce na komputerze. Dwie postacie, wspólne rozwiązywanie zagadek, sześć monet, brama i portal kończący misję. Grafika jest proceduralna i inspirowana zabawkowymi figurkami — bez zewnętrznych modeli czy logotypów.

## 1. Uruchomienie na Windows w VS Code

**Wymagania:** [Node.js](https://nodejs.org/) **22.12 lub nowszy**, VS Code, Chrome / Edge / Firefox. Nie trzeba instalować Godot ani żadnych dodatków do VS Code.

1. Rozpakuj ZIP. Otwórz folder `tosia-gucio-ninja` w VS Code (`File → Open Folder`).
2. Otwórz terminal (`Terminal → New Terminal`, PowerShell).
3. Wpisz kolejno:

   ```powershell
   node --version
   npm install
   npm run dev
   ```

4. Otwórz w przeglądarce adres, który poda Vite, zwykle **http://127.0.0.1:5173/**.
5. Do zatrzymania serwera w terminalu użyj `Ctrl+C`.

**Uwaga:** internet jest potrzebny przy pierwszym `npm install`, aby pobrać zależności. Sam prototyp nie łączy się z serwerem gry.

### Sterowanie

| Gracz | Chodzenie | Skok |
|---|---|---|
| Tosia (turkusowa postać) | W A S D | Spacja |
| Gucio (złota postać) | Strzałki | Enter |

Dwie postacie mogą poruszać się jednocześnie. Uwaga: niektóre klawiatury nie obsługują wszystkich kombinacji wciśniętych klawiszy (tzw. ghosting).

### Cel pierwszej misji

1. Każde ninja staje jednocześnie na jednej z **dwóch płyt**.
2. Brama otwiera się na stałe i umożliwia przejście przez most.
3. Zbieracie rozrzucone monety (na razie tylko licznik, bez sklepu).
4. Oboje docieracie do portalu — pojawia się ekran zwycięstwa.

## 2. Budowanie wersji produkcyjnej

```powershell
npm run check
npm run build
npm run preview
```

Wynik kompilacji trafia do `dist/`. Ten katalog w przyszłości można opublikować na Cloudflare Pages (komenda budowania `npm run build`, katalog publikacji `dist`). Na razie **nic nie jest automatycznie publikowane**.

## 3. Git i GitHub

W terminalu w katalogu projektu:

```powershell
git init
git add .
git commit -m "feat: pierwsza grywalna scena kooperacyjna"
git branch -M main
```

Aby umieścić kod na GitHubie, utwórz **puste repozytorium** `tosia-gucio-ninja` na swoim koncie, bez inicjalizacji README i `.gitignore`, a następnie wykonaj polecenia z GitHuba, np.:

```powershell
git remote add origin https://github.com/TWOJ-LOGIN/tosia-gucio-ninja.git
git push -u origin main
```

Nie używaj dosłownie `TWOJ-LOGIN` — to miejsce na nazwę konta. Alternatywnie, jeśli masz GitHub CLI (`gh`), można użyć `gh repo create`.

Dalszy proces proponowany dla każdego nowego zadania:

**Issue / wymaganie → nowa gałąź `feature/...` → kod → `npm run check` i test w przeglądarce → commit → Pull Request → merge do `main`.**

W `.github/workflows/ci.yml` jest automatyczny test kompilacji dla Pull Requestów i zmian na `main`. Repozytorium i automatyczna publikacja nie zostały jeszcze utworzone.

## 4. Struktura

```text
tosia-gucio-ninja/
├── .github/workflows/ci.yml   # weryfikacja kompilacji na GitHubie
├── docs/
│   ├── BACKLOG.md              # ustalone MVP vs późniejsza rozbudowa
│   └── TEST_PLAN.md            # scenariusz testów akceptacyjnych
├── public/favicon.svg          # ikona gry
├── src/
│   ├── game/
│   │   ├── Character.ts        # postać, uproszczona fizyka i skok
│   │   ├── Input.ts            # klawiatura dwóch graczy
│   │   ├── NinjaGame.ts        # cykl gry, kamera, zwycięstwo
│   │   ├── World.ts            # mapa, płyty, monety, brama, portal
│   │   ├── constants.ts        # parametry mechaniki
│   │   └── materials.ts        # kolory i materiały 3D
│   ├── main.ts                 # punkt startowy
│   └── styles.css              # wygląd nakładki i menu
├── index.html
├── package.json
├── tsconfig.json
└── README.md
```

## 5. Status i ograniczenia prototypu

- To **techniczny prototyp**, nie pełna gra w świecie Ninjago. Figurki i plansza to autorskie proste modele z brył; brak sześciu docelowych postaci, broni, mocy, sklepu i rozbudowanego świata.
- Ruch i skok są uproszczone. Nie ma fizyki kolizji między postaciami ani kolizji z ozdobnymi rekwizytami.
- Grywalność: **jeden komputer, dwie osoby, jedna klawiatura**. Bez multiplayera przez internet i bez mobilnego sterowania.
- Nie ma zapisu postępu ani backendu; restart zaczyna misję od nowa.
- **Instalacji pakietów i testu uruchomieniowego nie udało się przeprowadzić w środowisku przygotowania plików (limit czasu połączenia z rejestrem npm).** Prawdziwa walidacja nastąpi po `npm install` i `npm run build` na Twoim PC. Nie oznacza to, że prototyp przeszedł testy runtime.
- LEGO i Ninjago są znakami towarowymi ich właścicieli. Ten prototyp nie zawiera oficjalnych materiałów. Jeśli grę chcemy rozpowszechniać publicznie z oryginalnymi bohaterami i nazwami, trzeba rozważyć prawa do marki lub stworzyć własne postacie.

### Najbliższy kamień milowy

Uruchomić grę na Windows, sprawdzić czy Tosia i Gucio mogą swobodnie się poruszać oraz czy wspólne naciśnięcie dwóch płyt otwiera przejście. Następnie wspólnie z dziećmi poprawić sterowanie, skalę kamery, szybkość i czytelność zagadek.
