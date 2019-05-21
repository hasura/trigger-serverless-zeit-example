import {
  makeRemoteExecutableSchema,
  makeExecutableSchema,
  introspectSchema,
  mergeSchemas
} from 'graphql-tools';
import { HttpLink } from 'apollo-link-http';
import { ApolloServer } from 'apollo-server';
import fetch from 'node-fetch';

const METAWEATHER_API_URL = "https://www.metaweather.com/api/location/";

const typeDefs = `
    type CityWeather {
      temp: String
      min_temp: String
      max_temp: String
      city_name: String!
      applicable_date: String!
    }

    type Query {
      cityWeather(city_name: String! applicable_date: String): CityWeather
    }
  `;

const createNewSchema = async () => {
  // get weather data using woeid
  function getWeather(data){
      return fetch(METAWEATHER_API_URL + data.woeid)
          .then(response => response.json())
  }

  // get woeid (where on earth id) using city name
  function getWoeid(place){
      return fetch(`${METAWEATHER_API_URL}search/?query=${place}`)
          .then(response => response.json())
          .then(jsonResponse => jsonResponse[0])
  }

  // resolvers -> get where on earth id -> get consolidated_weather data and return
  const customResolvers = {
    Query: {
      cityWeather: (root, args, context, info) => {
        return getWoeid(args.city_name).then( function(response) {
          if (!response) {
            return null;
          }
          return getWeather(response).then( function(weather) {
            if (!weather) {
              return null;
            }
            let consolidated_weather = weather.consolidated_weather;
            // check for args applicable_date to apply filter
            consolidated_weather = args.applicable_date ? consolidated_weather.find(item => item.applicable_date === args.applicable_date) : consolidated_weather[0];
            const respObj = {'temp': consolidated_weather.the_temp.toString(), 'min_temp': consolidated_weather.min_temp.toString(), 'max_temp': consolidated_weather.max_temp.toString(), 'city_name': weather.title, 'applicable_date': consolidated_weather.applicable_date};
            return respObj;
          });
        });
      }
    },
  };

  const schema = makeExecutableSchema({
    typeDefs,
    customResolvers
  });

  // merge the schema along with custom resolvers
  return mergeSchemas({
    schemas: [ schema ],
    resolvers: customResolvers
  });

};

const runServer = async () => {
  // Get newly merged schema
  const schema = await createNewSchema();
  // start server with the new schema
  const server = new ApolloServer({
    schema
  });
  server.listen().then(({url}) => {
    console.log(`Running at ${url}`);
  });
};

try {
  runServer();
} catch (err) {
  console.error(err);
}
