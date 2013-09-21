#GLaDOS
A mineflayer bot for player stats and snitch networking, plus a CORS proxy for Civbounty and Civtrade.
#API Docs
All results are in JSON and use querystrings for arguments. I'm very open to changing this to an exact clone of Skynet's API, but can't find any documentation.
`216.249.101.26:3000/players`: array of online players as objects, currently only one element each: `username`

`216.249.101.26:3000/players/login`: Returns logins and logouts of players, in reverse chronological order. Don't use without `limit`, as it will be very long. Like this:
```
{
  username: String,
  logout: Boolean,
  date: Date
}
```
If `logout` is false, it's a login, if it's true it's a logout.
Takes `username`, `logout`, `date`, `limit` and `skip` arguments. `limit` is the number of results you want, `skip` the number to omit first. Useful for pagination.

`216.249.101.26:3000/entries`: Returns an array of snitch entries, like so:
```
{
  username: String,
  snitchName: String,
  coords: {
    x: Number,
    y: Number,
    z: Number
  },
  date: Date
}
```
Also supports `limit` and `skip`.

`216.249.101.26:3000/civtrade/shops`: Forwards from civtrade.herokuapp.com, adding CORS headers. See https://github.com/zacstewart/civtrade for details.
`216.249.101.26:3000/perpetrators`: Forwards from civbounty.com/api/perpetrators, adding CORS headers. Bug DecoyDrone for details. (seriously do, he needs to document his API better)
