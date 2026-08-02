/* =====================================================================
   💖 CONFIGURACIÓN DEL REGALO — ¡EDITA AQUÍ! 💖
   ---------------------------------------------------------------------
   👉 Todo lo que está entre comillas " ... " lo puedes cambiar.
   Guarda el archivo y recarga index.html para ver tus cambios.

   1) NOMBRES
      - novia      : el nombre de ella (aparece en el menú)
      - apodos     : apodos cariñosos (se muestran al azar en el juego)
      - remitente  : cómo firmas la carta (tu nombre / apodo)

   2) LA CARTA 💌
      - cartaTitulo : el título de la cartica
      - carta       : cada línea entre " " es un párrafo.
                      Aquí escribes TU mensaje para ella.
      - tip: puedes usar emojis y saltos de línea con \n

   3) FRASES DEL JUEGO
      - frasesJuego  : mensajitos que salen mientras juega
      - frasesMuerte : mensajes cuando se pierde
      - frasesEstacion : mensajes al llegar a una estación

   4) TIEMPO
      - metaMinutos : duración objetivo del viaje (por defecto 10)
   ===================================================================== */
const CONFIG = {

  // 👇 NOMBRES
  novia: "Juli",
  apodos: ["mi Mapachita 💖", "Juli 💕", "mi Julie 🌸"],
  remitente: "Con todo mi amor,\nJoshua 💘",

  // 👇 TÍTULOS
  titulo: "4º MES",
  subtitulo: "Un viajecito espacial hasta la carta para ti mi Juli :3 ✨",

  // 👇 LA CARTA (cada línea entre comillas = un párrafo)
  cartaTitulo: "Para mi Mapachita",
  carta: [
    "Wenaaaaaaaaash, como estasg mi mapachita peshoshaaaaaaaa, te dije que el joshua cartero volveria",
    "creo que la pasaste un poco mal con la papita, admito que la verdad esta bastante dificil, o almenos la primera version que hice estaba tan dificil que no lo pude pasar XDDD",
    "pero weño al caso, te amo muchito mi juli peshoshaaaaaaaa, me haces mucha faltaaaa",
    "te extraño amorcito, la verdad te amo mucho, enserio te amo bastante mi juli peshosa, para mi lo eres todo, enserio gracias por estos cuatro mesesitos de amor alegria felicidad ternura y mash coshitas, te amo muchito mi juli peshoshaaaaaaa",
    "sinceramente la verdad te amo mucho mi juli, te extraño",
    "te digo algo?, la verdad te admiro bastante amorcito, incluso desde que eras amigos, waos, aveces me gustaria ser como tu, eres bastante activa, alegre, chistosa, movida, tienes tu propia chispa unica, eres inteligente, carismatica, empatica y eres bastante responsable",
    "de verdad te admiro mucho amorcito, al lado tuyo me siento como un trocito o migaja de pan al lado de un pastel gigante, ay amorcito, te veo con mucha admiracion, y me siento bastante orgulloso de ti mi juli, y waos, no se como le haces, aunque no te niego que e sido bastante perezoso y reservado y por eso soy asi xd",
    "y puesh waos tu eres tremenda peshoshura, mira esa diva, pasa tu direccion pa ir a robar ese biscocho, tu eres hermosa amorcito, no te niego que ando como con la loquera pensandote mucho, y waos, me dan muchas ganas de darte besitos por todos lados amorcito",
    "ay mi juli peshosha",
    "te amo muchito mi juli peshosha, gracias por estos 4 mesesitos, tambien perdon por todas mis cagadas, tambien perdoname si te incomodan mis fetiches contigo XD",
    "ay anorcito nunca me dejes, te amo con todo, te amo muchoooooooooo",
    "amame mi juli peshosha, sin ti no seria nada como soy ahorita mismo, tanto que no tengo ni las mas minima idea de como seria mi vida si no te hubiera conocido, tu has cambiado muchos aspectos de mi vida, iniciando por mi felicidad, tambien esta la motivacion que me das para estudiar mas en el colegio, o estudiar programacion por mi mismo, me haces simplemente ser mejor a pesar de que no cambio de una pq aun teniendo casi la misma edad me enseñas cosas amorcito, eres bastante terca pero al mismo tiempo sabia juli, esho me gusta mucho de ti mi juli, me has dado enseñanzas que ni mis papas xdddd",
    "ay mi juli te amo mucho",
    "tu tambien amame juli",
    "te amo mucho mi juli, te amo demasiado",
    "te amoooooooooooooooooooo",
    ":3",
    "weño por si acaso te digo que la contraseña de la pagina de nuestras cartitas y anecdotas diarias sera la de nuestro dia que nos hicimos pareja mi juli peshosha ;3",
    "weño mi amorcito, el joshua cartero ya se despide",
    "te amo muchito mi juli peshoshaaaaaaaaaa",
    "disfruta de las cartitas y tambien de esta que es la de nuestro mesesito xdd",
    "te amo muchito mi juli peshoshaaaaaaaaaaa",
    "cuidate amorcito, chauuuuuuuu, te amo muchito mi juli peshoshaaaaaaaaa",
    "cuidateeeeeeee",
    "suerteeeeee",
    "chau mi amorcito peshoshaaaaa",
    "bye mi mapachitaaaaaaaa",
    "te amo juliiiiiiiiiiiiiiiii :3",
    ":p",
  ],
  // 👇 TIEMPO OBJETIVO DEL VIAJE (en minutos)
  metaMinutos: 10,
};