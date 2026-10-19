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

        REGLAS CONFIG PIPELINE EXPRESS
        ------------------------------
        - poner las funciones middleware que se ejecutan para todas las rutas al principio de la configuracion
        (pq suelen modificar el objeto "req" del cliente y le aÃ±aden propiedades q luego pueden ser usadas por las demas funciones
        middleware) NUNCA GENERAN RESPUESTA

        - poner las funciones middleware que se ejecutan para rutas especificas al final de la configuracion, especificando el metodo HTTP
        por el cual se accede a la ruta (get, post, etc). Estas funciones SI GENERAN RESPUESTA

    */
//#endregion
require('dotenv').config(); //<--- la funcion .config() lee el fichero .env y mete en objeto "process.env" las variables
                            //definidas como variables de entorno del sistema operativo, para que puedan ser usadas en cualquier
                            // parte del codigo de nodejs

const mongodb=require('mongodb'); //<--- el modulo "mongodb" exporta un objeto que asignamos a variable "mongodb", q expone props.
                                  // como MongoClient q sirve para crear el cliente conexion
const clienteConexionMongoDB=new mongodb.MongoClient(process.env.MONGODB_URL); //<--- en atlas la cadena conexion varia: mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net

const express=require('express'); //<--- el modulo "express" exporta una funcion que asignamos a variable "express",
//que al ejecutarla nos devuelve un objeto Application de Express:
// https://expressjs.com/en/5x/api/application/

//q es un servidor web que podemos configurar y ejecutar para atender peticiones HTTP en un determinado puerto
//para lo cual se usa el metodo .listen()
const cookieParser=require('cookie-parser'); //<--- el modulo "cookie-parser" exporta una funcion que asignamos a variable "cookieParser",
const cors=require('cors'); //<--- el modulo "cors" exporta una funcion que asignamos a variable "cors",
const jsonwebtoken=require('jsonwebtoken');  //<--- modulo para crear JWT de sesion de usuario
const bcrypt=require('bcrypt'); //<--- modulo para hashear y comprobar hashes de passwords de usuarios
const crypto=require('node:crypto'); //<--- genera el estado temporal para proteger el flujo OAuth

const webServer=express();
const GOOGLE_FRONTEND_CALLBACK_URL=process.env.GOOGLE_OAUTH2_FRONTEND_CALLBACK_URL
    || 'http://localhost:5173/Cliente/LoginGoogleCallback';
const GOOGLE_FRONTEND_ORIGIN=new URL(GOOGLE_FRONTEND_CALLBACK_URL).origin;

//------------------------------------ CONFIG PIPELINE: miiddleware-stack de express ---------------------------------------------
// webServer.use(
//     function(req,res,next){
//         console.log(`Peticion entrante: ${req.method} ${req.url}`);
//
//         res.status(200).send('Hola cliente....he recibido tu peticion y te devuelvo esta respuesta desde el servidor web en nodejs');
//         next(); //<--- invoca al siguiente middleware en la cadena de ejecucion
//     }
// )
webServer.use( express.json() ); //<---- 1Âº funcion middleware, lo que hace es meter en prop. "req.body" del objeto HTTP-REQUEST
                            //del cliente, los datos del cuerpo de la peticion HTTP si es un JSON valido, para que luego pueda ser
                            //  usado por los demas middlewares
webServer.use( express.urlencoded({extended:true}) ); //<---- 2Âº funcion middleware, extrae las variables del querystring de la URL
                                                    //crea un objeto JS: {variable_Query: valor, ...} y lo mete en prop. "req.query"


webServer.use( cookieParser() ); //<---- 3Âº funcion middleware, extrae las cookies de la cabecera Cookies del HTTP-REQUEST del cliente
                                //crea un objeto JS: {nombreCookie: valor, ...} y lo mete en prop. "req.cookies"


webServer.use(cors({
    origin: process.env.CORS_ORIGIN || GOOGLE_FRONTEND_ORIGIN,
    credentials: true
}));


webServer.get(
    '/api/Tienda/Categorias',
    async function(req,res,next){
        try{
            console.log(`Peticion entrante: ${req.method} ${req.url}`);
            //1Âº paso: conectarme a la BD, usando un cliente de conexion a MongoDB: mongodb<--- driver nativo para nodejs de mongodb
            await clienteConexionMongoDB.connect();
            //2Âº paso: ejecutar la consulta a la BD de Mongodb para recuperar las categorias de productos(en un principio
            //solo quiero las principales o raices, es decir, las q no tienen padre por encima)
            // <--- query: db['PcComponentes'].categorias.find( { tipo:'...' } )
            // <==== resultado: array de objetos a devolver al cliente en variable _categorias
            let _queryRegExp=/^\d+$/
            let __categorias=await clienteConexionMongoDB.db(process.env.MONGODB_DBNAME)
                                                        .collection('categorias')
                                                        .find({ pathCat: { $regex: _queryRegExp } })
                                                        .toArray();
            //3Âº paso: devolver la respuesta al cliente con el resultado de la operacion contra la BD
            console.log('Categorias recuperadas de la BD: ', __categorias);

            res.status(200).send(
                {
                    codigo:0, //<----- codigo de resultado de la operacion contra la bd, si es 0=ok, en caso contrario sera un error
                    mensaje:'categorias recuperadas correctametne',
                    categorias:__categorias
                }
            );

        } catch(error){
            console.log(`Error al recuperar categorias de la BD: ${error}`);
            res.status(200).send( { codigo: 1, mensaje: `Error al recuperar categorias de la BD: ${error}`, categorias:[] } );
        }
    }
)

webServer.post
(
    '/api/Cliente/Login',
    async function(req, res, next){
        try{
            //en req.body la funcion middleware express.json() ha metido el objeto { email: '....', password: '...'}
            //para procesarlo en este endpoint
            const { email, password } = req.body;

            //1Âº paso: conectarme a la bd y comprobar si existe un usuario con ese email....
            //         SI NO --> error no existe usuario con ese email
            await clienteConexionMongoDB.connect();
            const _usuario=await clienteConexionMongoDB.db(process.env.MONGODB_DBNAME)
                                                        .collection('clientes')
                                                        .findOne({ 'cuenta.email': email });

            if(! _usuario) throw new Error('No existe un usuario con ese email');
            console.log('Usuario recuperado de la BD: ', _usuario);

            //2Âº paso: si existe, comprobar si el hash q tiene almacenado coincide con el hash usandobcrypt.compare()
            //         de la password q me ha enviado ... SI NO ---> error de password incorrecta
            // TODO: si el usuario no ha activado su cuenta, no permitir login y devolver error de cuenta no activada
            // Tenmos que activarla
            if (! bcrypt.compareSync(password, _usuario.cuenta.password) ) throw new Error('Password incorrecta');

            //3Âº paso: crear JWT con los datos del usuario que me interesen preservar en la sesion y
            //         enviarselo al cliente (se podria usar una cookie, lo hacemos sin ellas) usando jsonwebtoken.sign()
            //         y la clave secreta q tenemos en el fichero .env
            const _token=jsonwebtoken.sign(
                { email: _usuario.cuenta.email, nombre: _usuario.nombre, _id: _usuario._id },
                process.env.JWT_SECRET,
                { expiresIn: '1h' } //<--- el token expira en 1 hora, hay q comprobar su caducidad en cada peticion q haga el cliente
            );

            //4Âº paso: devolver al cliente un objeto JSON con el resultado de la operacion
            res.status(200).send({ codigo:0, mensaje:'login correcto', token: _token });

        } catch(error){
            console.log(`Error al procesar login de cliente: ${error}`);
            res.status(200).send( { codigo: 1, mensaje: `Error al procesar login de cliente: ${error}`, token:'' } );
        }
    }
);



webServer.post
(
    '/api/Cliente/Registro',
    async function(req,res,next){
        try{
            //en req.body la funcion middleware express.json() ha metido el objeto { nombre: '....', email: '...', password: '...'}
            //para procesarlo en este endpoint
            const { nombre, email, password } = req.body;

            //1º paso: contectarme a la BD y comprobar si ya existe un usuario con ese email, si existe --> error
            await clienteConexionMongoDB.connect();

            const _clienteExiste=await clienteConexionMongoDB.db(process.env.MONGODB_DBNAME)
                                                        .collection('clientes')
                                                        .findOne({'cuenta.emaail': email});
            if(_clienteExiste) throw new Error('Ya existe un usuario con ese email');
            
            //2º paso: si no existe, hashear la password con brcrypt.hashSync() y almacenar datos en coleccion "clientes"  de la BD
            const _resultadoInsert=await clienteConexionMongoDB.db(process.env.MONGODB_DBNAME)
                                                        .collection('clientes')
                                                        .insertOne(
                                                            {
                                                                nombre: nombre,
                                                                apellidos:'',
                                                                cuenta:{
                                                                    email: email,
                                                                    password: bcrypt.hashSync(password, 10), //<--- hash de la password con 10 rondas de sal
                                                                    activada: false,
                                                                    telefono:''
                                                                },
                                                                direcciones:[],
                                                                listaFavoritos:[],
                                                                pedidos:[]
                                                            }
                                                        );
            console.log('Resultado de la insercion en la BD: ', _resultadoInsert);
            if( ! _resultadoInsert.insertedId ) throw new Error('No se ha podido insertar el cliente en la BD');

            //3º paso: generar un JWT de uso unico (caducidad muy breve) y mandarlo por email al cliente para que 
            //         confirme su registro, para ello se puede usar un servicio de envio de emails como nodemailer, sendgrid, etc
            /*
                            ENVIO DE EMAILS CON MAILJET USANDO SU API-REST
                            
                https://dev.mailjet.com/openapi/openapi-mailjet/send-emails/postsendv3

                necesario:
                    - crear cuenta en mailjet.com y obtener claves publicas y privadas para usar su API-REST
                    - mandar cada vez q hagas peticion a endpoint de mailjet una cabecera de autentificacion HTTP-BASIC
                      con este formato: 
                           Authorization: Basic <base64(publicKey:privateKey)>
                    - url o endpoint a invocar por POST: https://api.mailjet.com/v3/send

                    - en body de la peticion POST hay q enviar un JSON  con este formato
                      (añadir cabecera Content-Type: application/json):

                      {
                        "FromEmail":"pilot@mailjet.com", <------ email de registro en mailjet.com

                        "FromName":"Your Mailjet Pilot", <----- nombre de registro en mailjet.com
 
                        "Recipients":[
                            {
                            "Email":"passenger@mailjet.com", <---- email del cliente q esta registrando
                            "Name":"Passenger 1" <---------------- nombre del cliente
                            }
                        ],
                        "Subject":"Your email flight plan!", <---- asunto del email
                        "Html-part":"<h3>Dear passenger, welcome to Mailjet!</h3><br />May the delivery force be with you!"
                        }


            */
            const _codeBase64MailjetKeys=Buffer.from(`${process.even.MAILJET_PUBLIC_KEY}:${process.env.MAILJET_PRIVATE_KEY}`)
                                              .toString('base64');

            const _tokenActivacion=jsonwebtoken.sign(
                { email: email, _id: _resultadoInsert.insertedId },
                process.env.JWT_SECRET,
                { expiresIn: '10m' } //<--- el token expira en 10 minutos, hay q comprobar su caducidad en el endpoint de activacion de cuenta
            );
            
            const _bodyEmail={
                        "FromEmail":"pamaruiz69@gmail.com",
                        "FromName":"Administrador de PcComponentes", 
                        "Recipients":[
                            {
                            "Email": email, 
                            "Name": nombre
                            }
                        ],
                        "Subject":"Bienvenido a PcComponentes, confirma tu registro!",
                        "Html-part":`
                            <div>
                                <h1>Bienvendio a PcComponentes, ${nombre}</h1>                                
                            </div>
                            <div>
                                <p>Gracias por registrarte en PcComponentes. Tu cuenta ha sido creada correctamente.</p>
                                <p>Para activar tu cuenta, por favor haz clic en el siguiente enlace:</p>
                                <p>
                                    enlace:
                                    <a href="http://localhost:3000/api/Cliente/ActivarCuenta?token=${_tokenActivacion}&email=${email}&idCliente=${_resultadoInsert.insertedId}">
                                        Activar cuenta
                                    </a>
                                </p>
                                
                            </div>

                        `
                        }                    
            
            const _peticionMailjet=await fetch(
                'https://api.mailjet.com/v3/send',
                {
                    method: 'POST',
                    headers:{
                        'Authorization': 'Basic ' + _codeBase64MailjetKeys,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(_bodyEmail) //<--- serializamos el objeto JSON a string para enviarlo en el body de la peiticion
                }
            );
            console.log('Resultado de la peticion a Mailjet: ', _peticionMailjet); //codigo respuesta, cabeceras respuesta, body respuesta
            if( _peticionMailjet.status !== 201 ) throw new Error(`Error al enviar email de activacion de cuenta al email: ${email}`);
            
            //4º paso: generar respuesta al cliente con el resultado de la operacion registro para q revise su bandeja de entrada
            //         y confirme su registro con el link q le hemos enviado por email
            res.status(200)
                .send(
                    {
                        codigo:0, 
                        mensaje:'Cliente registrado correctamente, revisa tu bandeja de entrada para confirmar tu cuenta'
                    }
        );
        }catch(error){
            console.log(`Error al registrar cliente en la BD: ${error}`);
            res.status(200).send( { codigo: 1, mensaje: `Error al registrar cliente en la BD: ${error}` } );
        }
    }
) 


webServer.get(
    '/api/Cliente/ActivarCuenta',
    async function(req,res,next){
        try{
            //en el querystring de la solicitud por get vienen estos datos:
            // http://localhost:3000/api/Cliente/ActivarCuenta? token=.... & email=.... & idCliente=....
            // el middleware express.urlencoded() lo lee y lo mete en "req.query" como un objeto js: 
            // { token: '...', email: '...', idCliente: '...' }
            const { token, email, idCliente } = req.query;

            //1º paso: comprobar q el token es valido y no ha caducado, para ello usamos jsonwebtoken.verify()
            
            const _tokenValido = jsonwebtoken.verify(token, process.env.JWT_SECRET); 
            const { email: tokenEmail, id: tokenId } = _tokenValido;

            //2º paso: si el token es valido, extraer su payload y comprobar q los claims q lleva de email e idCliente
            //         coinciden con los q vienen en el querystring, si no coinciden --> error
            if (tokenEmail !== email || tokenId !== idCliente) {
                throw new Error('El token no coincide con el email o idCliente proporcionados');
            }
            //3º paso: si coinciden, conectarme a la BD y actualizar el campo "cuenta.activada" del cliente a true
            await clienteConexionMongoDB.connect();

            await db.collection('clientes').updateOne( //
                { _id: idCliente },
                { $set: { 'cuenta.activada': true } }
            );

            //4º paso: generar respuesta al cliente con el resultado de la operacion activacion de cuenta
            res.status(200).send( { codigo: 0, mensaje: 'Cuenta activada correctamente' } );

        } catch(error){
            console.log(`Error al activar cuenta de cliente: ${error}`);
            res.status(200).send( { codigo: 1, mensaje: `Error al activar cuenta de cliente: ${error}` } );
        }
    }
) 


//------------------------------------ FIN CONFIG PIPELINE: miiddleware-stack de express ---------------------------------------------



//------------------------------------ CONFIG GOOGLE OAUTH2 ---------------------------------------------


const { google }=require('googleapis');

function crearClienteOAuthGoogle(){
    const clientId=process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_OAUTH2_CLIENT_ID;
    const clientSecret=process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_OAUTH2_CLIENT_SECRET;
    const redirectUri=process.env.GOOGLE_OAUTH2_REDIRECT_URI
        || 'http://localhost:3000/api/Cliente/LoginGoogleCallback';
    if(!clientId || !clientSecret){
        throw new Error('Faltan las credenciales OAuth de Google en .env');
    }

    return new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );
}

function redirigirAReactConError(res,error){
    const callbackUrl=new URL(GOOGLE_FRONTEND_CALLBACK_URL);
    callbackUrl.searchParams.set('error', error.message || 'No se pudo iniciar sesión con Google');
    return res.redirect(callbackUrl.toString());
}

webServer.get(
    '/api/Cliente/LoginGoogle',
    async function(req,res,next){
        try{
            const oauth2Client=crearClienteOAuthGoogle();
            const state=crypto.randomBytes(32).toString('hex');

            res.cookie('google_oauth_state', state, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 10 * 60 * 1000
            });

            const url=oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: [
                    'openid',
                    'https://www.googleapis.com/auth/userinfo.email',
                    'https://www.googleapis.com/auth/userinfo.profile',
                    'https://www.googleapis.com/auth/user.phonenumbers.read'
                ],
                state
            });

            console.log('URL generada para login con Google OAuth2.0: ', url);
            return res.status(200).send({
                codigo: 0,
                mensaje: 'login con Google generado',
                datos: { url }
            });
        }catch(error){
            console.log(`Error al iniciar login con Google: ${error}`);
            return res.status(200).send({
                codigo: 1,
                mensaje: `Error al procesar login con Google OAuth2.0: ${error.message}`
            });
        }
    }
);

webServer.get(
    '/api/Cliente/LoginGoogleCallback',
    async function(req,res,next){
        try{
            const { code, state, error: googleError }=req.query;
            const stateCookie=req.cookies.google_oauth_state;
            res.clearCookie('google_oauth_state');

            if(googleError) throw new Error(`Google no autorizó el acceso: ${googleError}`);
            if(!code) throw new Error('Google no devolvió el código de autorización');
            if(!stateCookie || state !== stateCookie) throw new Error('El estado de autorización de Google no es válido');

            const oauth2Client=crearClienteOAuthGoogle();
            const { tokens }=await oauth2Client.getToken(code);
            if(!tokens.id_token) throw new Error('Google no devolvió un token de identidad');

            const ticket=await oauth2Client.verifyIdToken({
                idToken: tokens.id_token,
                audience: process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_OAUTH2_CLIENT_ID
            });
            const perfilGoogle=ticket.getPayload();
            if(!perfilGoogle?.email || !perfilGoogle.email_verified){
                throw new Error('La cuenta de Google no tiene un email verificado');
            }

            await clienteConexionMongoDB.connect();
            const coleccionClientes=clienteConexionMongoDB.db(process.env.MONGODB_DBNAME).collection('clientes');
            let cliente=await coleccionClientes.findOne({ 'cuenta.email': perfilGoogle.email });

            if(!cliente){
                const nombre=perfilGoogle.given_name || perfilGoogle.name || perfilGoogle.email.split('@')[0];
                const insercion=await coleccionClientes.insertOne({
                    nombre,
                    apellidos: perfilGoogle.family_name || '',
                    cuenta: {
                        email: perfilGoogle.email,
                        password: '',
                        activada: true,
                        telefono: ''
                    },
                    googleId: perfilGoogle.sub,
                    direcciones: [],
                    listaFavoritos: [],
                    pedidos: []
                });
                cliente={ _id: insercion.insertedId, nombre, cuenta: { email: perfilGoogle.email } };
            }else if(!cliente.cuenta?.activada){
                await coleccionClientes.updateOne(
                    { _id: cliente._id },
                    { $set: { 'cuenta.activada': true, googleId: perfilGoogle.sub } }
                );
                cliente.cuenta.activada=true;
            }

            const token=jsonwebtoken.sign(
                { email: cliente.cuenta.email, nombre: cliente.nombre, _id: cliente._id },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            const callbackUrl=new URL(GOOGLE_FRONTEND_CALLBACK_URL);
            // Enviamos el JWT en el fragmento para que no se incluya en peticiones HTTP ni en logs del servidor.
            callbackUrl.hash=new URLSearchParams({ token }).toString();
            return res.redirect(callbackUrl.toString());
        }catch(error){
            console.log(`Error en el callback de login con Google: ${error}`);
            return redirigirAReactConError(res,error);
        }
    }
);
//------------------------------------ FIN CONFIG PIPELINE: miiddleware-stack de express ---------------------------------------------
webServer.listen(
    3000, //<--- puerto de escucha del servidor web, en nodejs suele ser 3000
    error => {
        if(error){
            console.log(`Error al iniciar el servidor: ${error}`);
        } else {
            console.log(`----- Servidor web iniciado en http://localhost:3000/ ------`);
        }
    }
)
