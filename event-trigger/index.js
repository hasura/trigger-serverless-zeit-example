const {json, send} = require('micro');
const { query } = require('graphqurl');

const HGE_ENDPOINT = process.env.HGE_ENDPOINT;

const MUTATION_UPDATE_PROFILE = `
  mutation updateProfile ($object: profile_set_input!, $where_exp: profile_bool_exp! ) {
    update_profile (_set: $object, where: $where_exp) {
      affected_rows
      returning {
        id
        name
      }
    }
  }
`;

module.exports = async (req, res) => {
  let payload;
  try {
    payload = await json(req);
  } catch (error) {
    send(res, 400, { error });
    return;
  }

  const { id, event: {op, data}, table, trigger } = payload;

  try {
    const result = await query({
      query: MUTATION_UPDATE_PROFILE,
      endpoint: HGE_ENDPOINT,
      variables: {
        object: {
          name: data.new.name.split('').reverse().join('')
        },
        where_exp: {name: {_eq: data.new.name}}
      },
    });
    send(res, 200, { result });
  } catch (error) {
    send(res, 500, { error });
  }
};
