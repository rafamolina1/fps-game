# Pátio
FPS de navegador com mapa original, teclado e mouse. Duas equipes disputam rodadas de eliminação de 90 segundos. Cada jogador tem uma vida por rodada. Ao fim do tempo, ganha quem tiver mais sobreviventes. Empates não dão pontos. A primeira equipe com três vitórias ganha a partida.

## Começar
Com Node 20 ou superior, execute npm install e npm start. Abra o endereço mostrado no terminal, digite um apelido e crie uma sala. Sozinho, use Iniciar treino para praticar com alvos. Para competir, convide de 2 a 8 jogadores pelo link ou código antes de iniciar. Na rede local, abra o jogo pelo endereço LAN do anfitrião antes de copiar o convite.

WASD move, o mouse ou as setas giram a visão, clique ou espaço dispara, R recarrega e Esc abre o menu. O anfitrião pode voltar ao lobby para receber amigos.

## Hospedagem
Um serviço Node com WebSocket pode servir tudo no mesmo endereço. Use npm install e npm start com uma instância e a porta indicada por PORT. As salas ficam na memória.

Na Vercel, use o preset Other e defina GAME_SERVER_URL como a URL wss:// do servidor Node antes do build. O arquivo vercel.json publica dist. Rode npm run build para gerar os arquivos estáticos.
