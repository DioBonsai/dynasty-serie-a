/* ==========================================================================
   QUIZZOTTI — Database: Mr.White (nomi calciatori)
   Estratto da MrWhite.html per separare i dati dalla logica di gioco.
   ========================================================================== */

const wordsList = [
  "Alessandro Del Piero", "Francesco Totti", "Roberto Baggio", "Gianluigi Buffon", "Paolo Maldini", "Fabio Cannavaro",
  "Andrea Pirlo", "Gennaro Gattuso", "Alessandro Nesta", "Filippo Inzaghi", "Christian Vieri", "Gabriel Batistuta",
  "Roberto Bettega", "Gianni Rivera", "Giuseppe Bergomi", "Dino Zoff", "Marco van Basten", "Ruud Gullit",
  "Frank Rijkaard", "Dennis Bergkamp", "Patrick Kluivert", "Edgar Davids", "Clarence Seedorf", "Johan Cruyff",
  "Ronald Koeman", "Zinedine Zidane", "Thierry Henry", "Patrick Vieira", "Robert Pirès", "David Trezeguet",
  "Eric Cantona", "Jean-Pierre Papin", "Michel Platini", "Marcel Desailly", "Lilian Thuram", "Lionel Messi",
  "Cristiano Ronaldo", "Neymar", "Kylian Mbappé", "Sergio Ramos", "Luka Modric", "Toni Kroos",
  "Manuel Neuer", "Thomas Müller", "Robert Lewandowski", "Karim Benzema", "Eden Hazard", "Kevin De Bruyne",
  "Virgil van Dijk", "Mohamed Salah", "Sadio Mané", "Harry Kane", "Raheem Sterling", "Paul Pogba",
  "N'Golo Kanté", "Antoine Griezmann", "Romelu Lukaku", "Erling Haaland", "Bruno Fernandes", "Jadon Sancho",
  "Phil Foden", "Mason Mount", "Frenkie de Jong", "Matthijs de Ligt", "Kai Havertz", "Trent Alexander-Arnold",
  "Andrew Robertson", "Alisson Becker", "Jan Oblak", "Marc-André ter Stegen", "Giorgio Chiellini", "Leonardo Bonucci",
  "Kalidou Koulibaly", "Raphaël Varane", "Aymeric Laporte", "Joshua Kimmich", "Marquinhos", "Thiago Silva",
  "Sergio Busquets", "Casemiro", "Fabinho", "Ilkay Gündogan", "Marco Reus", "Leroy Sané",
  "Memphis Depay", "Ángel Di María", "Paulo Dybala", "Luis Suárez", "Sergio Agüero", "Gareth Bale",
  "Ivan Rakitic", "Arturo Vidal", "Dani Alves", "Jordi Alba", "David Silva", "Cesc Fàbregas",
  "Xabi Alonso", "Andrés Iniesta", "Fernandinho", "David Luiz", "Diego Godín", "Edinson Cavani",
  "Radamel Falcao", "James Rodríguez", "Alexis Sánchez", "Gianluigi Donnarumma", "Keylor Navas", "Hugo Lloris",
  "Samir Handanovic", "Wojciech Szczesny", "Milan Škriniar", "Nicolás Otamendi", "Diego Costa", "Mauro Icardi",
  "Dries Mertens", "Lorenzo Insigne", "Ciro Immobile", "Edin Džeko", "Miralem Pjanic", "Ivan Perišic",
  "Aleksandar Kolarov", "Stefan de Vrij", "Nicolò Barella", "Federico Chiesa", "Nicolo Zaniolo", "Sandro Tonali",
  "Gianluca Mancini", "Merih Demiral", "Achraf Hakimi", "Theo Hernandez", "Dušan Tadic", "Hakim Ziyech",
  "Donny van de Beek", "Steven Bergwijn", "Ryan Gravenberch", "Martin Ødegaard", "Pedri", "Ansu Fati",
  "Ferran Torres", "Eduardo Camavinga", "Jude Bellingham", "Bukayo Saka", "Mason Greenwood", "Reece James",
  "Declan Rice", "Federico Valverde", "Rodrygo", "Vinícius Júnior", "Federico Bernardeschi", "Moise Kean",
  "Nicolò Cambiaso", "Fabio Miretti", "Tommaso Baldanzi", "Lorenzo Lucca", "Riccardo Sottil", "Nicolò Rovella",
  "Raoul Bellanova", "Nicolò Fagioli", "Samuele Ricci", "Alessandro Buongiorno", "Davide Frattesi", "Marco Carnesecchi",
  "Gianluca Frabotta", "Giuseppe Pezzella", "Gianluca Scamacca", "Alessandro Bastoni", "Davide Calabria", "Giovanni Di Lorenzo",
  "Andrea Pinamonti", "Federico Dimarco", "Matteo Pessina", "Luca Pellegrini", "Gianluca Caprari", "Riccardo Orsolini",
  "Fabio Miccoli", "Duván Zapata", "Luis Muriel", "Vanja Milinkovic-Savic", "Marcus Thuram", "Kenneth Reijnders",
  "Ademola Lookman", "Christian Pulisic", "Nico Paz", "David de Gea", "Kenan Yildiz", "Rafael Leão",
  "Florian Thauvin", "Axel Rrahmani", "Manuel Locatelli", "Ederson", "Scott McTominay", "Issa Ndoye",
  "Marten de Roon", "André-Frank Zambo Anguissa", "Yann Sommer", "Matteo Politano", "Gabriele Savona", "Gabriel Strefezza",
  "Matheus da Cunha", "Tiquinho Soares", "Angeliño", "Evan Ndicka", "Denny Dumfries", "Matías Soulé",
  "Eldor Shomurodov", "Bryan Cristante", "Leandro Paredes", "Manu Koné", "Mert Müldür", "Saul Niguez",
  "Mbangula", "Nicolò Casadei", "Eljif Elmas", "Adama Tameze", "Yann Karamoh", "Che Adams",
  "Randal Kolo Muani", "Nico González", "Koopmeiners", "Timothy Weah", "Ajdin Hrustic", "Kalidou Kalulu",
  "Cabal", "Liam Kelly", "Salvatore Sirigu", "David Neres", "Noah Okafor", "Giacomo Raspadori",
  "Michel-Ange Ngongé", "Billy Gilmour", "Pasquale Mazzocchi", "Leonardo Spinazzola", "Alex Meret", "Pierluigi Montipò",
  "Vitinha", "Jeremie De Winter", "Tom Dele-Bashiru", "Valentín Castellanos", "Alessio Romagnoli", "Mandas",
  "Dele Alli", "Saliou Diao", "Folorunsho Balogun", "Birkir Bjarnason", "Rolando Mandragora", "Dodo",
  "Bonny", "Dennis Man", "Bernabe Pavlovic", "Matej Bijol", "Matteo Gabbia", "Fikayo Tomori",
  "Hien", "Germán Djimsiti", "Mario Pasalic", "Davide Zappacosta", "Lucas Castro", "Joshua Dallinga",
  "Jhon Lucumí", "Lucas Vázquez", "Antonio Rüdiger", "Mikel Merino", "Gabriel Martinelli", "Jurriën Timber",
  "Eric Dier", "Michael Olise", "Urbig", "Antonín Barák", "Jordan Veretout", "Alessandro Matri",
  "Tanguy Ndombele", "Sam Lammers", "Kaoru Mitoma", "Daniele Padelli", "Renan Lodi",
  "Andrea Consigli", "Diego Milito", "Simone Verdi", "Lucas Digne", "Mario Götze",
  "Filip Kostic", "Claudio Marchisio", "Alexandre Lacazette", "Saud Abdulhamid",
];

const playerImages = {
      'Alessandro Del Piero': 'https://example.com/delpiero.jpg',
      'Francesco Totti': 'https://example.com/totti.jpg',
      'Roberto Baggio': 'https://example.com/baggio.jpg',
      // Aggiungi altre immagini qui...
    };

if (typeof module !== "undefined" && module.exports) { module.exports = { wordsList, playerImages }; }
