using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using RunningWebApi.Models;

namespace RunningWebApi.Services;

public class AuthService
{
    private readonly UserService _userService;
    private readonly IConfiguration _config;

    public AuthService(UserService userService, IConfiguration config)
    {
        _userService = userService;
        _config = config;
    }

    public async Task<string?> AuthenticateAsync(string username, string password)
    {
        // Buscar usuario por username
        var user = (await _userService.GetAllAsync()).FirstOrDefault(u => u.Username == username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            return null; // Usuario no encontrado o contraseña incorrecta
        }

        // Generar token JWT
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtKey =
            _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT key is not configured.");
        if (string.IsNullOrEmpty(jwtKey) || jwtKey.Length < 32)
        {
            throw new InvalidOperationException("JWT debe contener al menos 32 caracteres.");
        }
        var key = Encoding.ASCII.GetBytes(jwtKey);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
                new[]
                {
                    new Claim(ClaimTypes.Name, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                }
            ),
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature
            ),
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
