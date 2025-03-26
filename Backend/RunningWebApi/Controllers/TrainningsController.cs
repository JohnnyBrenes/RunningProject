using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using RunningWebApi.Models;
using RunningWebApi.Services;

namespace RunningWebApi.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TrainningsController(SupabaseService supabaseService) : ControllerBase
{
    private readonly SupabaseService _supabaseService = supabaseService;

    [HttpGet]
    public async Task<ActionResult<List<TrainningResponseDto>>> Get()
    {
        var result = await _supabaseService.GetAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TrainningResponseDto>> GetById(Guid id)
    {
        var result = await _supabaseService.GetByIdAsync(id);
        if (result == null)
        {
            return NotFound();
        }
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<TrainningResponseDto>> Post([FromBody] TrainningDto trainning)
    {
        var result = await _supabaseService.CreateAsync(trainning);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _supabaseService.DeleteAsync(id);
        if (!success)
        {
            return NotFound();
        }
        return NoContent();
    }
}
