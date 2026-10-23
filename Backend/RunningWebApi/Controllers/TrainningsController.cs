using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RunningWebApi.Models;
using RunningWebApi.Services;

namespace RunningWebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TrainningsController(TrainningService supabaseService) : ControllerBase
{
    private readonly TrainningService _supabaseService = supabaseService;

    // Los entrenamientos se guardan por username (columna userid), así que el dueño
    // se identifica con el claim "username" del token. Tokens emitidos antes de que
    // existiera ese claim no lo tienen: se responde 401 para que el frontend cierre
    // la sesión y el usuario vuelva a iniciarla.
    private string? CurrentUsername => User.FindFirst("username")?.Value;

    private bool IsCurrentUser(string userId) =>
        string.Equals(userId, CurrentUsername, StringComparison.Ordinal);

    [HttpGet("{id}")]
    public async Task<ActionResult<TrainningResponseDto>> GetById(Guid id)
    {
        if (CurrentUsername == null)
        {
            return Unauthorized();
        }

        var result = await _supabaseService.GetByIdAsync(id);
        // Un entrenamiento de otro usuario se trata como inexistente para no revelar que existe.
        if (result == null || !IsCurrentUser(result.UserId))
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<TrainningResponseDto>>> GetByUserId(string userId)
    {
        if (CurrentUsername == null)
        {
            return Unauthorized();
        }
        if (!IsCurrentUser(userId))
        {
            return Forbid();
        }

        var result = await _supabaseService.GetByUserIdAsync(userId);
        return Ok(result);
    }

    [HttpGet("user/{userId}/year/{year}")]
    public async Task<ActionResult<List<TrainningResponseDto>>> GetByUserIdAndYear(
        string userId,
        int year
    )
    {
        if (CurrentUsername == null)
        {
            return Unauthorized();
        }
        if (!IsCurrentUser(userId))
        {
            return Forbid();
        }

        var result = await _supabaseService.GetByUserIdAndYearAsync(userId, year);
        return Ok(result);
    }

    [HttpGet("user/{userId}/years")]
    public async Task<ActionResult<List<int>>> GetYearsByUserId(string userId)
    {
        if (CurrentUsername == null)
        {
            return Unauthorized();
        }
        if (!IsCurrentUser(userId))
        {
            return Forbid();
        }

        var result = await _supabaseService.GetYearsByUserIdAsync(userId);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<TrainningResponseDto>> Post([FromBody] TrainningDto trainning)
    {
        var username = CurrentUsername;
        if (username == null)
        {
            return Unauthorized();
        }

        // El dueño siempre es el usuario del token; se ignora cualquier userId del body.
        var result = await _supabaseService.CreateAsync(trainning, username);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var username = CurrentUsername;
        if (username == null)
        {
            return Unauthorized();
        }

        var success = await _supabaseService.DeleteAsync(id, username);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }
}
