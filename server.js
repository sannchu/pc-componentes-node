//#region -------------------- MODULO PRINCIPAL DE ENTRADA a NODEJS ------------------------
/*
    express funciona mediatne la secuenciacion de una serie de modulos middleware (en nodejs son funciones JS)
    que se ejecutan en orden de declaracion:

                        |-------------------- pipeline o middleware-stack --------------------- .......
    pet.cliente ---->  func.middle-1(req,res,next) -- next() --> func.middle-2(req,res,next) -- next() --> func.middle-3(req,res,next) ---> ... ---> func.middle-n(req,res,next) ---> res.send() ----> pet.cliente
                            ||                                          ||
                        en "req" objeto HTTP-REQUEST        en "req" objeto HTTP-REQUEST modif por middle-1
                        del cliente(la puede modificar)     en "res" objeto HTTP-RESPONSE
                        en "res" objeto HTTP-RESPONSE                   |
                 <-----------|                                          |
                 <-------------------------------------------------------
     
      para configurar el pipeline de express se emplean metodos de la clase Application de express, como por ejemplo:
        .use( ['/ruta',] function(req,res,next){....} ) ----> registra una funcion middleware q se ejecuta para todas las peticiones q hagan
                                                            los clientes SINO SE ESPECIFICA UNA RUTA
        .get( '/ruta', function(req,res,next){....} ) ----> registra una funcion middleware q se ejecuta para todas las peticiones GET 
                                                            q hagan los clientes a la ruta especificada
        .post( '/ruta', function(req,res,next){....} ) ----> registra una funcion middleware q se ejecuta para todas las peticiones POST
                                                            q hagan los clientes a la ruta especificada
        (igual para .put(), .delete(), .patch(), etc)                                                 
        ....

    */  
//#endregion

const express=require('express'); //<--- el modulo "express" exporta una funcion que asignamos a variable "express",
//que al ejecutarla nos devuelve un objeto Application de Express:
// https://expressjs.com/en/5x/api/application/

//q es un servidor web que podemos configurar y ejecutar para atender peticiones HTTP en un determinado puerto
//para lo cual se usa el metodo .listen()

const cokieParser=require('cookie-parser'); //<--- el modulo "cookie-parser" exporta una funcion que asignamos a variable "cookieParser",
//que al ejecutarla nos devuelve un objeto middleware que podemos registrar en el pipeline de express para que analice las cookies
//de las peticiones HTTP entrantes y las asigne a req.cookies
const cors=require('cors'); //<--- el modulo "cors" exporta una funcion que asignamos a variable "cors",
//que al ejecutarla nos devuelve un objeto middleware que podemos registrar en el pipeline de express para permitir el acceso a la API desde cualquier origen (CORS: Cross-Origin Resource Sharing)

const webServer=express();

//------------------------------------ CONFIG PIPELINE: miiddleware-stack de express ---------------------------------------------
/*
webServer.use(
    function(req,res,next){
        console.log(`Peticion entrante: ${req.method} ${req.url}`);
        
        res.status(200).send('Hola cliente....he recibido tu peticion y te devuelvo esta respuesta desde el servidor web en nodejs');
        next(); //<--- invoca al siguiente middleware en la cadena de ejecucion
    }
)
*/

webServer.use(express.json()); //<--- middleware que analiza el cuerpo de la peticion HTTP y si es un JSON lo convierte a objeto JS y lo asigna a req.body




webServer.use(express.urlencoded({ extended: true })); //<--- middleware que analiza el cuerpo de la peticion HTTP y si es un formulario HTML lo convierte a objeto JS y lo asigna a req.body



webServer.use(cokieParser()); //<--- middleware que analiza las cookies de la peticion HTTP y las asigna a req.cookies


webServer.use(cors()); //<--- middleware que permite el acceso a la API desde cualquier origen (CORS: Cross-Origin Resource Sharing)

webServer.get('/api/Tienda/Categorias', function(req, res) {
    res.status(200).send('Ahora mismo te mando las CATEGORIAS.....');

});

// Responde a las peticiones que no coinciden con ninguna ruta.
webServer.use(function(req, res) {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

//------------------------------------ FIN CONFIG PIPELINE: miiddleware-stack de express ---------------------------------------------
const port = process.env.PORT || 3000;
webServer.listen(port, function() {
    console.log(`----- Servidor web iniciado en http://localhost:${port}/ ------`);
});
