using Microsoft.AspNetCore.Mvc;
using RunningWebApi.Models;
using RunningWebApi.Services;

namespace RunningWebApi.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var token = await _authService.AuthenticateAsync(request.Username, request.Password);

        if (token == null)
        {
            return Unauthorized(new { message = "Credenciales inválidas" });
        }

        return Ok(new { token });
    }
}
