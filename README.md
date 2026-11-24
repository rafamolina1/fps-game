# Bagunça Cósmica
FPS arcade de navegador para 2–8 amigos. No Rei do Pato, encoste no pato e acumule um ponto por segundo. Um acerto solta o pato. No Laser Tag, cada acerto em um adversário marca um ponto para sua equipe. A meta ou o relógio encerra a rodada. Empates são permitidos.

## Jogar localmente
Com Node 20 ou superior, rode `npm install` e `npm start`. Abra http://localhost:3000 em um navegador de desktop, crie uma sala e entre em uma segunda janela com o código. Na LAN, compartilhe o endereço de rede do computador. Three.js é instalado pelo npm e servido localmente. O terminal mostra o endereço quando o servidor está pronto. O comando permanece em execução enquanto o jogo está aberto.

## Publicar
A opção mais simples é importar este repositório em um serviço Node com WebSocket (por exemplo Render Web Service), instalar com `npm install` e iniciar com `npm start`. Uma instância serve o site e as salas no mesmo endereço. O processo usa PORT fornecido pela plataforma. Compartilhe o link HTTPS.

Para usar a Vercel, publique primeiro o serviço Node acima. Importe o mesmo repositório na Vercel com preset Other e configure GAME_SERVER_URL como wss:// seguido do domínio público do serviço Node. Faça o deploy após definir a variável. vercel.json executa node build.js e publica dist. A Vercel serve o cliente e as conexões de jogo vão direto ao serviço Node.

## Partidas
O anfitrião define vagas ao criar a sala e escolhe modo, duração e meta antes de iniciar. Use Copiar convite para compartilhar o código no link. Cada participante clica em Jogar para capturar o mouse. WASD move, mouse mira, clique dispara, Shift corre, espaço pula e Esc abre sensibilidade e volume. Quando o anfitrião sai, a sala fecha. Um reinício do processo encerra todas as salas. Mantenha uma única instância do servidor, pois o estado fica em memória.
