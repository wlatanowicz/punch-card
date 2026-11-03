Odtwarzamy funkcje aplikacji StoCard, która zniknęła:
- trzyma kopie fizycznych kart lojalnosciowych
- skanuje kod kreskowy/QR fizycznej karty
- wyswietla kod kreskowy/QR karty lojalnosciowej
Dodatkowo:
- do uzywania tej funkcji nie jest konieczne logowanie
- dla uzytkownikow zalogowanych:
-- backup kodów online
- podpowiadanie karty na podstawie lokalizacji (wykrywa sklep)
- jesli zalogowany, to ma dostep do swoich kart w wersji mobilnej

Dodajemy funkcję elektronicznej karty na pieczątki:
- będą dwa widoki w aplikacji mobilnej
-- dla klienta (z funkcjami jak wyzej + zbieranie pieczatek)
-- dla sprzedawcy (np. restauracja, fryzjer etc) umozliwiajaca wbijanie pieczatek
- opcja dla sprzedawcy widoczna jest tylko, gdy zalogowany jest uzytkownik typu sprzedawca

- taby w aplikacji
-- dla wszystkich
--- lista dodanych kart z kodami, z tego widoku przejscie do dodawania kolejnej skanerem
--- kod QR aplikacji
--- ustawienia: np. konto online
-- dla sprzedawcow:
--- skaner kodow klientow (duzy tab na srodku, zeby latwiej trafic)

- klient pokazuje kod QR w aplikacji mobilnej, sprzedawca skanuje, sprzedawca w swojej aplikacji wbija pieczatki, pieczatki pojawiaja się u klienta
- kod QR do zbierania pieczatek jest unikalny dla uzytkownika (wszystkim sprzedawcom pokazuje taki sam kod)
- widok zebranych pieczatek w aplikacji klienta symuluje prawdziwa karte na pieczatki:
-- kratka 2x3, 2x4 lub 2x5 (do wyboru)
-- logo sprzedawcy
-- tło udajace papier
-- sprzedawca ma mozliwosc zdefiniowania swojego wzoru (wgrywa plik graficzny)
-- wbite pieczatki maja losowany kat i ofset (informacja zapisana w bazie danych, aby sie nie zmieniala)
- kazda pieczatka ma swoj rekord w bazie danych dla traceability
- zarzadanie kontem sprzedawcy przez strone www (historia pieczatek, statystyki itp.)
- wizualizacja karty z pieczatkami dostepna z listy kart lojalnosciowych
- wielu uzytkownikow moze byc powiazanych z jednym kontem sprzedawcy